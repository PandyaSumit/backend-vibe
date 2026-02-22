const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const Project = require('../models/Project');
const SchemaDefinition = require('../models/SchemaDefinition');
const CustomEndpoint = require('../models/CustomEndpoint');
const { generateFullProject } = require('../services/codeGenerator');

// Generate full project code (returns JSON with all files)
router.post('/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const schemas = await SchemaDefinition.find({ project: project._id });
    const customEndpoints = await CustomEndpoint.find({ project: project._id });
    const files = generateFullProject(project, schemas, customEndpoints);

    res.json({ project: project.name, files });
  } catch (err) {
    next(err);
  }
});

// Download project as zip
router.get('/:projectId/download', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const schemas = await SchemaDefinition.find({ project: project._id });
    const customEndpoints = await CustomEndpoint.find({ project: project._id });
    const files = generateFullProject(project, schemas, customEndpoints);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-api.zip"`
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    files.forEach((file) => {
      archive.append(file.content, { name: file.path });
    });

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
