const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SchemaDefinition = require('../models/SchemaDefinition');
const Project = require('../models/Project');

// Cache for dynamically created models (avoid re-registration)
const modelCache = new Map();

const MONGOOSE_TYPE_MAP = {
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  ObjectId: mongoose.Schema.Types.ObjectId,
  Mixed: mongoose.Schema.Types.Mixed,
};

function buildMongooseSchema(schemaDef) {
  const definition = {};

  (schemaDef.fields || []).forEach((field) => {
    const config = {};

    if (field.fieldType === 'Array') {
      if (field.arrayType === 'ObjectId' && field.ref) {
        definition[field.name] = [{ type: mongoose.Schema.Types.ObjectId, ref: field.ref }];
      } else {
        definition[field.name] = [MONGOOSE_TYPE_MAP[field.arrayType] || mongoose.Schema.Types.Mixed];
      }
      return;
    }

    if (field.fieldType === 'ObjectId') {
      config.type = mongoose.Schema.Types.ObjectId;
      if (field.ref) config.ref = field.ref;
    } else {
      config.type = MONGOOSE_TYPE_MAP[field.fieldType] || mongoose.Schema.Types.Mixed;
    }

    if (field.required) config.required = true;
    if (field.unique) config.unique = true;
    if (field.default !== undefined && field.default !== '') {
      if (field.fieldType === 'Date' && field.default === 'now') {
        config.default = Date.now;
      } else {
        config.default = field.default;
      }
    }
    if (field.enumValues && field.enumValues.length > 0) {
      config.enum = field.enumValues;
    }

    definition[field.name] = config;
  });

  const options = {};
  if (schemaDef.timestamps) options.timestamps = true;

  return new mongoose.Schema(definition, options);
}

function getSandboxModel(schemaDef, projectId) {
  // Use sandboxed collection name to isolate test data
  const collectionName = `sbx_${projectId.toString().slice(-8)}_${schemaDef.name.toLowerCase()}`;
  const cacheKey = `${projectId}_${schemaDef.name}`;

  // Check if model exists and schema hasn't changed
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey);
  }

  // Clean up any existing model with this name
  const modelName = `Sandbox_${cacheKey}`;
  if (mongoose.models[modelName]) {
    delete mongoose.models[modelName];
    delete mongoose.modelSchemas?.[modelName];
  }

  const schema = buildMongooseSchema(schemaDef);
  const model = mongoose.model(modelName, schema, collectionName);
  modelCache.set(cacheKey, model);
  return model;
}

// Execute a sandbox operation
router.post('/:projectId/execute', async (req, res, next) => {
  try {
    const { collection, method, id, body, query } = req.body;

    if (!collection) return res.status(400).json({ error: 'collection is required' });
    if (!method) return res.status(400).json({ error: 'method is required' });

    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (!allowedMethods.includes(method.toUpperCase())) {
      return res.status(400).json({ error: `Invalid method. Allowed: ${allowedMethods.join(', ')}` });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const schemaDef = await SchemaDefinition.findOne({
      project: req.params.projectId,
      name: collection,
    });
    if (!schemaDef) {
      return res.status(404).json({ error: `Schema "${collection}" not found in this project` });
    }

    const Model = getSandboxModel(schemaDef, req.params.projectId);
    const httpMethod = method.toUpperCase();

    let result;
    const startTime = Date.now();

    switch (httpMethod) {
      case 'GET': {
        if (id) {
          result = await Model.findById(id).lean();
          if (!result) return res.status(404).json({ error: 'Document not found' });
        } else {
          const filter = {};
          const queryParams = query || {};
          const page = parseInt(queryParams.page) || 1;
          const limit = Math.min(parseInt(queryParams.limit) || 20, 100);
          const skip = (page - 1) * limit;
          const sort = queryParams.sort || '-createdAt';

          // Build filters from query params (only for fields that exist)
          const fieldNames = (schemaDef.fields || []).map((f) => f.name);
          Object.entries(queryParams).forEach(([key, value]) => {
            if (fieldNames.includes(key) && value !== undefined && value !== '') {
              const field = schemaDef.fields.find((f) => f.name === key);
              if (field?.fieldType === 'String') {
                filter[key] = new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
              } else {
                filter[key] = value;
              }
            }
          });

          const [items, total] = await Promise.all([
            Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            Model.countDocuments(filter),
          ]);

          result = {
            data: items,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          };
        }
        break;
      }

      case 'POST': {
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Request body is required for POST' });
        }
        // Sanitize: only allow fields defined in schema
        const fieldNames = (schemaDef.fields || []).map((f) => f.name);
        const sanitized = {};
        Object.entries(body).forEach(([key, value]) => {
          if (fieldNames.includes(key)) {
            sanitized[key] = value;
          }
        });
        result = await Model.create(sanitized);
        result = result.toObject();
        break;
      }

      case 'PUT': {
        if (!id) return res.status(400).json({ error: 'id is required for PUT' });
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Request body is required for PUT' });
        }
        const fieldNames = (schemaDef.fields || []).map((f) => f.name);
        const sanitized = {};
        Object.entries(body).forEach(([key, value]) => {
          if (fieldNames.includes(key)) {
            sanitized[key] = value;
          }
        });
        result = await Model.findByIdAndUpdate(id, sanitized, {
          new: true,
          runValidators: true,
        }).lean();
        if (!result) return res.status(404).json({ error: 'Document not found' });
        break;
      }

      case 'DELETE': {
        if (!id) return res.status(400).json({ error: 'id is required for DELETE' });
        result = await Model.findByIdAndDelete(id).lean();
        if (!result) return res.status(404).json({ error: 'Document not found' });
        result = { message: 'Deleted', deleted: result };
        break;
      }
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      method: httpMethod,
      collection,
      duration: `${duration}ms`,
      statusCode: httpMethod === 'POST' ? 201 : 200,
      result,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message, type: 'ValidationError' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format', type: 'CastError' });
    }
    next(err);
  }
});

// Clear sandbox data for a project
router.delete('/:projectId/reset', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const schemas = await SchemaDefinition.find({ project: req.params.projectId });
    const prefix = `sbx_${req.params.projectId.toString().slice(-8)}_`;

    let cleared = 0;
    for (const schema of schemas) {
      const collectionName = `${prefix}${schema.name.toLowerCase()}`;
      try {
        await mongoose.connection.db.collection(collectionName).drop();
        cleared++;
      } catch {
        // Collection may not exist
      }
    }

    // Clear model cache for this project
    for (const key of modelCache.keys()) {
      if (key.startsWith(req.params.projectId.toString())) {
        const modelName = `Sandbox_${key}`;
        if (mongoose.models[modelName]) {
          delete mongoose.models[modelName];
        }
        modelCache.delete(key);
      }
    }

    res.json({ message: `Sandbox reset. ${cleared} collection(s) cleared.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
