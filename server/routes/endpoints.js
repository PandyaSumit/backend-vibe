const express = require('express');
const router = express.Router();
const CustomEndpoint = require('../models/CustomEndpoint');
const SchemaDefinition = require('../models/SchemaDefinition');
const Project = require('../models/Project');
const { generateEndpointDefinition, validateEndpoint } = require('../services/groqService');

// Generate endpoint definition from natural language using Groq AI
router.post('/generate', async (req, res, next) => {
  try {
    const { projectId, prompt, groqApiKey } = req.body;

    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const apiKey = groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Groq API key is required. Set GROQ_API_KEY in environment or pass groqApiKey in request body.',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const schemas = await SchemaDefinition.find({ project: projectId });
    if (schemas.length === 0) {
      return res.status(400).json({ error: 'Project has no schemas. Create schemas first.' });
    }

    const result = await generateEndpointDefinition(prompt, schemas, apiKey);

    res.json({
      endpoint: result.endpoint,
      warnings: result.warnings,
      valid: result.valid,
      sourcePrompt: prompt,
    });
  } catch (err) {
    next(err);
  }
});

// Save a generated endpoint definition
router.post('/', async (req, res, next) => {
  try {
    const {
      project,
      name,
      description,
      method,
      path,
      sourceCollection,
      outputFields,
      filters,
      sort,
      pagination,
      aggregations,
      groupBy,
      auth,
      cache,
      safetyNotes,
      sourcePrompt,
    } = req.body;

    if (!project) return res.status(400).json({ error: 'project is required' });
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!path) return res.status(400).json({ error: 'path is required' });
    if (!sourceCollection) return res.status(400).json({ error: 'sourceCollection is required' });

    // Re-validate against current schemas
    const schemas = await SchemaDefinition.find({ project });
    const validationErrors = validateEndpoint(req.body, schemas);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const endpoint = await CustomEndpoint.create({
      project,
      name,
      description,
      method: method || 'GET',
      path,
      sourceCollection,
      outputFields: outputFields || [],
      filters: filters || [],
      sort: sort || {},
      pagination: pagination || { enabled: true, defaultLimit: 20, maxLimit: 100 },
      aggregations: aggregations || [],
      groupBy: groupBy || '',
      auth: auth || {},
      cache: cache || {},
      safetyNotes: safetyNotes || [],
      sourcePrompt: sourcePrompt || '',
    });

    res.status(201).json(endpoint);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An endpoint with this path and method already exists' });
    }
    next(err);
  }
});

// List all custom endpoints for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const endpoints = await CustomEndpoint.find({ project: req.params.projectId }).sort({
      createdAt: -1,
    });
    res.json(endpoints);
  } catch (err) {
    next(err);
  }
});

// Get single endpoint
router.get('/:id', async (req, res, next) => {
  try {
    const endpoint = await CustomEndpoint.findById(req.params.id);
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });
    res.json(endpoint);
  } catch (err) {
    next(err);
  }
});

// Update endpoint
router.put('/:id', async (req, res, next) => {
  try {
    const endpoint = await CustomEndpoint.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });
    res.json(endpoint);
  } catch (err) {
    next(err);
  }
});

// Delete endpoint
router.delete('/:id', async (req, res, next) => {
  try {
    const endpoint = await CustomEndpoint.findByIdAndDelete(req.params.id);
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });
    res.json({ message: 'Endpoint deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
