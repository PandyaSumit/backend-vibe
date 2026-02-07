const express = require('express');
const router = express.Router();
const SchemaDefinition = require('../models/SchemaDefinition');
const Project = require('../models/Project');
const { generateModelCode, generateRouteCode } = require('../services/codeGenerator');

// Get all schemas for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const schemas = await SchemaDefinition.find({
      project: req.params.projectId,
    }).sort({ createdAt: -1 });
    res.json(schemas);
  } catch (err) {
    next(err);
  }
});

// Get single schema
router.get('/:id', async (req, res, next) => {
  try {
    const schema = await SchemaDefinition.findById(req.params.id);
    if (!schema) return res.status(404).json({ error: 'Schema not found' });
    res.json(schema);
  } catch (err) {
    next(err);
  }
});

// Create schema
router.post('/', async (req, res, next) => {
  try {
    const { project, name, fields, timestamps, collectionName, generateCrud, endpoints } = req.body;

    if (!project) return res.status(400).json({ error: 'Project ID is required' });
    if (!name) return res.status(400).json({ error: 'Schema name is required' });

    const projectExists = await Project.findById(project);
    if (!projectExists) return res.status(404).json({ error: 'Project not found' });

    const schema = await SchemaDefinition.create({
      project,
      name,
      collectionName: collectionName || '',
      fields: fields || [],
      timestamps: timestamps !== false,
      generateCrud: generateCrud !== false,
      endpoints: endpoints || {},
    });

    res.status(201).json(schema);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A schema with this name already exists in this project' });
    }
    next(err);
  }
});

// Update schema
router.put('/:id', async (req, res, next) => {
  try {
    const { name, fields, timestamps, collectionName, generateCrud, endpoints } = req.body;

    const schema = await SchemaDefinition.findByIdAndUpdate(
      req.params.id,
      { name, fields, timestamps, collectionName, generateCrud, endpoints },
      { new: true, runValidators: true }
    );

    if (!schema) return res.status(404).json({ error: 'Schema not found' });
    res.json(schema);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A schema with this name already exists in this project' });
    }
    next(err);
  }
});

// Delete schema
router.delete('/:id', async (req, res, next) => {
  try {
    const schema = await SchemaDefinition.findByIdAndDelete(req.params.id);
    if (!schema) return res.status(404).json({ error: 'Schema not found' });
    res.json({ message: 'Schema deleted' });
  } catch (err) {
    next(err);
  }
});

// Preview generated code for a single schema
router.get('/:id/preview', async (req, res, next) => {
  try {
    const schema = await SchemaDefinition.findById(req.params.id).populate('project');
    if (!schema) return res.status(404).json({ error: 'Schema not found' });

    const allSchemas = await SchemaDefinition.find({ project: schema.project._id });

    const modelCode = generateModelCode(schema);
    const routeCode = schema.generateCrud ? generateRouteCode(schema, allSchemas) : null;

    res.json({
      model: { filename: `models/${schema.name}.js`, code: modelCode },
      route: routeCode
        ? { filename: `routes/${schema.name.toLowerCase()}s.js`, code: routeCode }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
