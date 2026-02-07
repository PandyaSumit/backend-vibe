const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const SchemaDefinition = require('../models/SchemaDefinition');

// List all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ updatedAt: -1 });

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const schemaCount = await SchemaDefinition.countDocuments({
          project: project._id,
        });
        return { ...project.toObject(), schemaCount };
      })
    );

    res.json(projectsWithCounts);
  } catch (err) {
    next(err);
  }
});

// Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const schemas = await SchemaDefinition.find({ project: project._id }).sort({
      createdAt: -1,
    });

    res.json({ ...project.toObject(), schemas });
  } catch (err) {
    next(err);
  }
});

// Create project
router.post('/', async (req, res, next) => {
  try {
    const { name, description, dbName, port } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const project = await Project.create({
      name,
      description: description || '',
      dbName: dbName || name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      port: port || 3000,
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// Update project
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, dbName, port } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, dbName, port },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// Delete project (and all its schemas)
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await SchemaDefinition.deleteMany({ project: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
