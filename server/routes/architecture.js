const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const SchemaDefinition = require('../models/SchemaDefinition');
const ProjectSettings = require('../models/ProjectSettings');
const { generateArchitecture } = require('../services/architectureService');
const { decrypt } = require('../services/encryption');

async function resolveGroqKey(projectId) {
  const settings = await ProjectSettings.findOne({ project: projectId });
  if (settings && settings.groqApiKeyEncrypted) {
    return decrypt(settings.groqApiKeyEncrypted);
  }
  return process.env.GROQ_API_KEY || '';
}

// Generate architecture from natural language
router.post('/generate', async (req, res, next) => {
  try {
    const { projectId, prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const apiKey = await resolveGroqKey(projectId);
    if (!apiKey) {
      return res.status(400).json({
        error: 'Groq API key not configured. Go to Settings to add your key.',
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
    if (entities.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 entities per save' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const validTypes = ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Array', 'Mixed'];
    const created = [];

    for (const entity of entities) {
      if (!entity.name || typeof entity.name !== 'string') continue;

      // Validate field types
      const fields = (entity.fields || []).filter((f) => {
        if (!f.name || typeof f.name !== 'string') return false;
        if (!validTypes.includes(f.fieldType)) return false;
        return true;
      });

      const existing = await SchemaDefinition.findOne({
        project: projectId,
        name: entity.name,
      });

      if (existing) {
        existing.fields = fields;
        existing.timestamps = entity.timestamps !== false;
        existing.generateCrud = entity.generateCrud !== false;
        existing.collectionName = entity.collectionName || '';
        await existing.save();
        created.push(existing);
      } else {
        const schema = await SchemaDefinition.create({
          project: projectId,
          name: entity.name,
          collectionName: entity.collectionName || '',
          fields,
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
