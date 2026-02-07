const express = require('express');
const router = express.Router();
const ProjectSettings = require('../models/ProjectSettings');
const Project = require('../models/Project');

// Get settings for a project (masks the API key)
router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let settings = await ProjectSettings.findOne({ project: req.params.projectId });

    if (!settings) {
      settings = await ProjectSettings.create({ project: req.params.projectId });
    }

    const hasKey = !!settings.groqApiKeyEncrypted;
    const maskedKey = hasKey
      ? `gsk_...${ settings.getGroqApiKey().slice(-4) }`
      : '';

    res.json({
      project: settings.project,
      groqApiKey: maskedKey,
      hasGroqApiKey: hasKey,
      sandboxEnabled: settings.sandboxEnabled,
    });
  } catch (err) {
    next(err);
  }
});

// Update settings
router.put('/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let settings = await ProjectSettings.findOne({ project: req.params.projectId });

    if (!settings) {
      settings = new ProjectSettings({ project: req.params.projectId });
    }

    // Update Groq API key if provided
    if (req.body.groqApiKey !== undefined) {
      const key = req.body.groqApiKey.trim();
      if (key && !key.startsWith('gsk_')) {
        return res.status(400).json({ error: 'Invalid Groq API key format. Must start with gsk_' });
      }
      settings.setGroqApiKey(key);
    }

    if (req.body.sandboxEnabled !== undefined) {
      settings.sandboxEnabled = req.body.sandboxEnabled;
    }

    await settings.save();

    const hasKey = !!settings.groqApiKeyEncrypted;
    res.json({
      project: settings.project,
      hasGroqApiKey: hasKey,
      sandboxEnabled: settings.sandboxEnabled,
      message: 'Settings updated',
    });
  } catch (err) {
    next(err);
  }
});

// Helper: get decrypted Groq key for internal use by other routes
router.getGroqKey = async function (projectId) {
  const settings = await ProjectSettings.findOne({ project: projectId });
  if (!settings) return process.env.GROQ_API_KEY || '';
  const key = settings.getGroqApiKey();
  return key || process.env.GROQ_API_KEY || '';
};

module.exports = router;
