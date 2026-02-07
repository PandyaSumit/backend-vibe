const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const SchemaDefinition = require('../models/SchemaDefinition');
const { generateArchitecture } = require('../services/architectureService');

// Generate architecture from natural language
router.post('/generate', async (req, res, next) => {
  try {
    const { projectId, prompt, groqApiKey } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const apiKey = groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Groq API key is required.',
      });
    }

    const result = await generateArchitecture(prompt, apiKey);

    res.json({
      entities: result.entities,
      relationships: result.relationships,
      warnings: result.warnings,
      sourcePrompt: prompt,
    });
  } catch (err) {
    next(err);
  }
});

// Save architecture (batch-create schemas for a project)
router.post('/save', async (req, res, next) => {
  try {
    const { projectId, entities } = req.body;

    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!entities || entities.length === 0) {
      return res.status(400).json({ error: 'entities are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const created = [];

    for (const entity of entities) {
      // Check if schema with this name already exists
      const existing = await SchemaDefinition.findOne({
        project: projectId,
        name: entity.name,
      });

      if (existing) {
        // Update it
        existing.fields = entity.fields || [];
        existing.timestamps = entity.timestamps !== false;
        existing.generateCrud = entity.generateCrud !== false;
        existing.collectionName = entity.collectionName || '';
        await existing.save();
        created.push(existing);
      } else {
        // Create new
        const schema = await SchemaDefinition.create({
          project: projectId,
          name: entity.name,
          collectionName: entity.collectionName || '',
          fields: entity.fields || [],
          timestamps: entity.timestamps !== false,
          generateCrud: entity.generateCrud !== false,
        });
        created.push(schema);
      }
    }

    res.status(201).json({
      message: `${created.length} schemas saved`,
      schemas: created,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate schema name detected' });
    }
    next(err);
  }
});

module.exports = router;
