/**
 * Code Generator Service
 *
 * Generates production-ready Node.js + Express + Mongoose code
 * from visual schema definitions.
 */

function toModelName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function toRouteName(name) {
  return name.toLowerCase() + 's';
}

function toVarName(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function indent(str, level = 1) {
  const spaces = '  '.repeat(level);
  return str
    .split('\n')
    .map((line) => (line.trim() ? spaces + line : line))
    .join('\n');
}

// ---------- Mongoose Model Generator ----------

function generateFieldDefinition(field) {
  const parts = [];

  if (field.fieldType === 'ObjectId') {
    parts.push(`type: mongoose.Schema.Types.ObjectId`);
    if (field.ref) parts.push(`ref: '${toModelName(field.ref)}'`);
  } else if (field.fieldType === 'Array') {
    if (field.arrayType === 'ObjectId' && field.ref) {
      return `[{ type: mongoose.Schema.Types.ObjectId, ref: '${toModelName(field.ref)}' }]`;
    }
    if (field.arrayType && field.arrayType !== 'Mixed') {
      return `[${field.arrayType}]`;
    }
    return '[mongoose.Schema.Types.Mixed]';
  } else if (field.fieldType === 'Mixed') {
    parts.push(`type: mongoose.Schema.Types.Mixed`);
  } else {
    parts.push(`type: ${field.fieldType}`);
  }

  if (field.required) parts.push(`required: true`);
  if (field.unique) parts.push(`unique: true`);

  if (field.default !== undefined && field.default !== null && field.default !== '') {
    if (field.fieldType === 'String') {
      parts.push(`default: '${field.default}'`);
    } else if (field.fieldType === 'Boolean') {
      parts.push(`default: ${field.default === 'true' || field.default === true}`);
    } else if (field.fieldType === 'Date' && field.default === 'now') {
      parts.push(`default: Date.now`);
    } else {
      parts.push(`default: ${field.default}`);
    }
  }

  if (field.enumValues && field.enumValues.length > 0) {
    const vals = field.enumValues.map((v) => `'${v}'`).join(', ');
    parts.push(`enum: [${vals}]`);
  }

  if (field.fieldType === 'String') {
    if (field.minLength) parts.push(`minlength: ${field.minLength}`);
    if (field.maxLength) parts.push(`maxlength: ${field.maxLength}`);
  }

  if (field.fieldType === 'Number') {
    if (field.min !== undefined && field.min !== null) parts.push(`min: ${field.min}`);
    if (field.max !== undefined && field.max !== null) parts.push(`max: ${field.max}`);
  }

  if (field.fieldType === 'String' && !field.unique) {
    parts.push(`trim: true`);
  }

  return `{\n${indent(parts.join(',\n'), 2)}\n  }`;
}

function generateModelCode(schema) {
  const modelName = toModelName(schema.name);
  const fields = schema.fields || [];

  let fieldDefs = fields
    .map((f) => `  ${f.name}: ${generateFieldDefinition(f)}`)
    .join(',\n');

  let code = `const mongoose = require('mongoose');\n\n`;
  code += `const ${toVarName(schema.name)}Schema = new mongoose.Schema(\n`;
  code += `  {\n${fieldDefs ? indent(fieldDefs, 0) : ''}\n  }`;

  const options = [];
  if (schema.timestamps) options.push(`timestamps: true`);
  if (schema.collectionName) options.push(`collection: '${schema.collectionName}'`);

  if (options.length > 0) {
    code += `,\n  { ${options.join(', ')} }`;
  }

  code += `\n);\n\n`;
  code += `module.exports = mongoose.model('${modelName}', ${toVarName(schema.name)}Schema);\n`;

  return code;
}

// ---------- Express Route Generator ----------

function generateRouteCode(schema, allSchemas) {
  const modelName = toModelName(schema.name);
  const varName = toVarName(schema.name);
  const routeName = toRouteName(schema.name);
  const endpoints = schema.endpoints || {};

  // Determine which fields are refs for population
  const refFields = (schema.fields || [])
    .filter((f) => f.fieldType === 'ObjectId' && f.ref)
    .map((f) => f.name);

  const populateChain = refFields.map((f) => `.populate('${f}')`).join('');

  let code = `const express = require('express');\n`;
  code += `const router = express.Router();\n`;
  code += `const ${modelName} = require('../models/${modelName}');\n\n`;

  // GET all
  if (endpoints.getAll !== false) {
    code += `// Get all ${routeName}\n`;
    code += `router.get('/', async (req, res) => {\n`;
    code += `  try {\n`;
    code += `    const page = parseInt(req.query.page) || 1;\n`;
    code += `    const limit = parseInt(req.query.limit) || 20;\n`;
    code += `    const skip = (page - 1) * limit;\n`;
    code += `    const sort = req.query.sort || '-createdAt';\n\n`;

    // Build filter from query params
    const filterableFields = (schema.fields || []).filter(
      (f) => ['String', 'Number', 'Boolean', 'ObjectId'].includes(f.fieldType)
    );
    if (filterableFields.length > 0) {
      code += `    const filter = {};\n`;
      filterableFields.forEach((f) => {
        if (f.fieldType === 'String') {
          code += `    if (req.query.${f.name}) filter.${f.name} = new RegExp(req.query.${f.name}, 'i');\n`;
        } else {
          code += `    if (req.query.${f.name}) filter.${f.name} = req.query.${f.name};\n`;
        }
      });
      code += `\n`;
      code += `    const [items, total] = await Promise.all([\n`;
      code += `      ${modelName}.find(filter)${populateChain}.sort(sort).skip(skip).limit(limit),\n`;
      code += `      ${modelName}.countDocuments(filter),\n`;
      code += `    ]);\n`;
    } else {
      code += `    const [items, total] = await Promise.all([\n`;
      code += `      ${modelName}.find()${populateChain}.sort(sort).skip(skip).limit(limit),\n`;
      code += `      ${modelName}.countDocuments(),\n`;
      code += `    ]);\n`;
    }

    code += `\n`;
    code += `    res.json({\n`;
    code += `      data: items,\n`;
    code += `      pagination: {\n`;
    code += `        page,\n`;
    code += `        limit,\n`;
    code += `        total,\n`;
    code += `        pages: Math.ceil(total / limit),\n`;
    code += `      },\n`;
    code += `    });\n`;
    code += `  } catch (err) {\n`;
    code += `    res.status(500).json({ error: err.message });\n`;
    code += `  }\n`;
    code += `});\n\n`;
  }

  // GET by id
  if (endpoints.getById !== false) {
    code += `// Get ${varName} by ID\n`;
    code += `router.get('/:id', async (req, res) => {\n`;
    code += `  try {\n`;
    code += `    const item = await ${modelName}.findById(req.params.id)${populateChain};\n`;
    code += `    if (!item) return res.status(404).json({ error: '${modelName} not found' });\n`;
    code += `    res.json(item);\n`;
    code += `  } catch (err) {\n`;
    code += `    res.status(500).json({ error: err.message });\n`;
    code += `  }\n`;
    code += `});\n\n`;
  }

  // POST create
  if (endpoints.create !== false) {
    code += `// Create ${varName}\n`;
    code += `router.post('/', async (req, res) => {\n`;
    code += `  try {\n`;
    code += `    const item = await ${modelName}.create(req.body);\n`;
    code += `    res.status(201).json(item);\n`;
    code += `  } catch (err) {\n`;
    code += `    if (err.name === 'ValidationError') {\n`;
    code += `      return res.status(400).json({ error: err.message });\n`;
    code += `    }\n`;
    code += `    res.status(500).json({ error: err.message });\n`;
    code += `  }\n`;
    code += `});\n\n`;
  }

  // PUT update
  if (endpoints.update !== false) {
    code += `// Update ${varName}\n`;
    code += `router.put('/:id', async (req, res) => {\n`;
    code += `  try {\n`;
    code += `    const item = await ${modelName}.findByIdAndUpdate(\n`;
    code += `      req.params.id,\n`;
    code += `      req.body,\n`;
    code += `      { new: true, runValidators: true }\n`;
    code += `    );\n`;
    code += `    if (!item) return res.status(404).json({ error: '${modelName} not found' });\n`;
    code += `    res.json(item);\n`;
    code += `  } catch (err) {\n`;
    code += `    if (err.name === 'ValidationError') {\n`;
    code += `      return res.status(400).json({ error: err.message });\n`;
    code += `    }\n`;
    code += `    res.status(500).json({ error: err.message });\n`;
    code += `  }\n`;
    code += `});\n\n`;
  }

  // DELETE
  if (endpoints.delete !== false) {
    code += `// Delete ${varName}\n`;
    code += `router.delete('/:id', async (req, res) => {\n`;
    code += `  try {\n`;
    code += `    const item = await ${modelName}.findByIdAndDelete(req.params.id);\n`;
    code += `    if (!item) return res.status(404).json({ error: '${modelName} not found' });\n`;
    code += `    res.json({ message: '${modelName} deleted' });\n`;
    code += `  } catch (err) {\n`;
    code += `    res.status(500).json({ error: err.message });\n`;
    code += `  }\n`;
    code += `});\n\n`;
  }

  code += `module.exports = router;\n`;

  return code;
}

// ---------- Full Project Generator ----------

function generateServerEntry(project, schemas, customEndpoints) {
  const routeImports = schemas
    .filter((s) => s.generateCrud)
    .map((s) => {
      const routeName = toRouteName(s.name);
      return `const ${routeName}Routes = require('./routes/${routeName}');`;
    })
    .join('\n');

  const routeUse = schemas
    .filter((s) => s.generateCrud)
    .map((s) => {
      const routeName = toRouteName(s.name);
      return `app.use('/api/${routeName}', ${routeName}Routes);`;
    })
    .join('\n');

  // Custom endpoint imports and mounts
  const customImports = (customEndpoints || [])
    .map((ep) => {
      const filename = ep.path
        .replace('/api/custom/', '')
        .replace(/\//g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const varName = filename.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Route';
      return `const ${varName} = require('./routes/custom-${filename || 'endpoint'}');`;
    })
    .join('\n');

  const customUse = (customEndpoints || [])
    .map((ep) => {
      const filename = ep.path
        .replace('/api/custom/', '')
        .replace(/\//g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const varName = filename.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Route';
      return `app.use('${ep.path}', ${varName});`;
    })
    .join('\n');

  return `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || ${project.port || 3000};

// Middleware
app.use(cors());
app.use(express.json());

// CRUD Routes
${routeImports}

${routeUse}
${customImports ? `\n// Custom API Endpoints\n${customImports}\n\n${customUse}` : ''}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(\`Server running on port \${PORT}\`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
`;
}

function generateProjectPackageJson(project) {
  return JSON.stringify(
    {
      name: project.dbName || project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      version: '1.0.0',
      description: project.description || `API server for ${project.name}`,
      main: 'server.js',
      scripts: {
        start: 'node server.js',
        dev: 'nodemon server.js',
      },
      dependencies: {
        cors: '^2.8.5',
        dotenv: '^16.4.5',
        express: '^4.21.0',
        mongoose: '^8.7.0',
      },
      devDependencies: {
        nodemon: '^3.1.7',
      },
    },
    null,
    2
  );
}

function generateEnvExample(project) {
  return `MONGODB_URI=mongodb://localhost:27017/${project.dbName || project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}
PORT=${project.port || 3000}
NODE_ENV=development
`;
}

// ---------- Custom Endpoint Route Generator ----------

function generateCustomEndpointCode(endpoint, schemas) {
  const modelName = toModelName(endpoint.sourceCollection);
  const filters = endpoint.filters || [];
  const aggs = endpoint.aggregations || [];
  const isAggregation = aggs.length > 0;

  let code = `const express = require('express');\n`;
  code += `const router = express.Router();\n`;
  code += `const ${modelName} = require('../models/${modelName}');\n\n`;

  code += `// ${endpoint.description || endpoint.name}\n`;
  if (endpoint.sourcePrompt) {
    code += `// Generated from: "${endpoint.sourcePrompt}"\n`;
  }

  if (endpoint.safetyNotes && endpoint.safetyNotes.length > 0) {
    endpoint.safetyNotes.forEach((note) => {
      code += `// Safety: ${note}\n`;
    });
  }

  code += `router.${endpoint.method.toLowerCase()}('/', async (req, res) => {\n`;
  code += `  try {\n`;

  if (isAggregation) {
    code += `    const pipeline = [];\n\n`;

    if (filters.length > 0) {
      code += `    const match = {};\n`;
      filters.forEach((f) => {
        const mongoOp = {
          eq: '$eq', ne: '$ne', gt: '$gt', gte: '$gte',
          lt: '$lt', lte: '$lte', in: '$in', nin: '$nin',
          regex: '$regex', exists: '$exists',
        }[f.operator];

        if (f.valueSource === 'static' && f.staticValue !== undefined && f.staticValue !== null) {
          code += `    match.${f.field} = { '${mongoOp}': ${JSON.stringify(f.staticValue)} };\n`;
        } else if (f.operator === 'between') {
          code += `    if (req.query.${f.field}_from || req.query.${f.field}_to) {\n`;
          code += `      match.${f.field} = {};\n`;
          code += `      if (req.query.${f.field}_from) match.${f.field}.$gte = req.query.${f.field}_from;\n`;
          code += `      if (req.query.${f.field}_to) match.${f.field}.$lte = req.query.${f.field}_to;\n`;
          code += `    }\n`;
        } else {
          code += `    if (req.query.${f.field}) match.${f.field} = { '${mongoOp}': req.query.${f.field} };\n`;
        }
      });
      code += `    if (Object.keys(match).length > 0) pipeline.push({ $match: match });\n\n`;
    }

    const groupId = endpoint.groupBy ? `'$${endpoint.groupBy}'` : 'null';
    const groupAccumulators = aggs
      .map((a) => {
        const op = { count: '$sum', sum: '$sum', avg: '$avg', min: '$min', max: '$max' }[a.operation];
        const val = a.operation === 'count' ? '1' : `'$${a.field}'`;
        return `        ${a.alias}: { '${op}': ${val} }`;
      })
      .join(',\n');

    code += `    pipeline.push({\n`;
    code += `      $group: {\n`;
    code += `        _id: ${groupId},\n`;
    code += `${groupAccumulators}\n`;
    code += `      }\n`;
    code += `    });\n\n`;

    if (endpoint.sort?.field) {
      const sortField = endpoint.sort.field === endpoint.groupBy ? '_id' : endpoint.sort.field;
      code += `    pipeline.push({ $sort: { '${sortField}': ${endpoint.sort.order === 'asc' ? 1 : -1} } });\n\n`;
    }

    code += `    const result = await ${modelName}.aggregate(pipeline);\n`;
    code += `    res.json({ data: result });\n`;
  } else {
    code += `    const filter = {};\n`;
    filters.forEach((f) => {
      if (f.valueSource === 'static' && f.staticValue !== undefined && f.staticValue !== null) {
        if (f.operator === 'eq') {
          code += `    filter.${f.field} = ${JSON.stringify(f.staticValue)};\n`;
        } else {
          const mongoOp = { ne: '$ne', gt: '$gt', gte: '$gte', lt: '$lt', lte: '$lte' }[f.operator];
          code += `    filter.${f.field} = { '${mongoOp}': ${JSON.stringify(f.staticValue)} };\n`;
        }
      } else if (f.operator === 'between') {
        code += `    if (req.query.${f.field}_from || req.query.${f.field}_to) {\n`;
        code += `      filter.${f.field} = {};\n`;
        code += `      if (req.query.${f.field}_from) filter.${f.field}.$gte = req.query.${f.field}_from;\n`;
        code += `      if (req.query.${f.field}_to) filter.${f.field}.$lte = req.query.${f.field}_to;\n`;
        code += `    }\n`;
      } else if (f.operator === 'regex') {
        code += `    if (req.query.${f.field}) filter.${f.field} = new RegExp(req.query.${f.field}, 'i');\n`;
      } else if (f.operator === 'eq') {
        code += `    if (req.query.${f.field}) filter.${f.field} = req.query.${f.field};\n`;
      } else {
        const mongoOp = { ne: '$ne', gt: '$gt', gte: '$gte', lt: '$lt', lte: '$lte', in: '$in', nin: '$nin' }[f.operator];
        code += `    if (req.query.${f.field}) filter.${f.field} = { '${mongoOp}': req.query.${f.field} };\n`;
      }
    });

    const outputFields = endpoint.outputFields || [];
    const projection = outputFields.length > 0 ? outputFields.join(' ') : '';

    if (endpoint.pagination?.enabled !== false) {
      code += `\n    const page = parseInt(req.query.page) || 1;\n`;
      code += `    const limit = Math.min(parseInt(req.query.limit) || ${endpoint.pagination?.defaultLimit || 20}, ${endpoint.pagination?.maxLimit || 100});\n`;
      code += `    const skip = (page - 1) * limit;\n`;

      const sortStr = endpoint.sort?.field
        ? `'${endpoint.sort.order === 'asc' ? '' : '-'}${endpoint.sort.field}'`
        : "'-createdAt'";

      code += `\n    const [items, total] = await Promise.all([\n`;
      code += `      ${modelName}.find(filter)${projection ? `.select('${projection}')` : ''}.sort(${sortStr}).skip(skip).limit(limit),\n`;
      code += `      ${modelName}.countDocuments(filter),\n`;
      code += `    ]);\n\n`;
      code += `    res.json({\n`;
      code += `      data: items,\n`;
      code += `      pagination: { page, limit, total, pages: Math.ceil(total / limit) },\n`;
      code += `    });\n`;
    } else {
      const sortStr = endpoint.sort?.field
        ? `'${endpoint.sort.order === 'asc' ? '' : '-'}${endpoint.sort.field}'`
        : "'-createdAt'";

      code += `\n    const items = await ${modelName}.find(filter)${projection ? `.select('${projection}')` : ''}.sort(${sortStr}).limit(${endpoint.pagination?.maxLimit || 100});\n`;
      code += `    res.json({ data: items });\n`;
    }
  }

  code += `  } catch (err) {\n`;
  code += `    res.status(500).json({ error: err.message });\n`;
  code += `  }\n`;
  code += `});\n\n`;
  code += `module.exports = router;\n`;

  return code;
}

function generateFullProject(project, schemas, customEndpoints) {
  const files = [];

  files.push({
    path: 'package.json',
    content: generateProjectPackageJson(project),
  });

  files.push({
    path: '.env.example',
    content: generateEnvExample(project),
  });

  files.push({
    path: 'server.js',
    content: generateServerEntry(project, schemas, customEndpoints),
  });

  schemas.forEach((schema) => {
    files.push({
      path: `models/${toModelName(schema.name)}.js`,
      content: generateModelCode(schema),
    });
  });

  schemas
    .filter((s) => s.generateCrud)
    .forEach((schema) => {
      files.push({
        path: `routes/${toRouteName(schema.name)}.js`,
        content: generateRouteCode(schema, schemas),
      });
    });

  // Custom endpoint routes
  (customEndpoints || []).forEach((ep) => {
    const filename = ep.path
      .replace('/api/custom/', '')
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/g, '');
    files.push({
      path: `routes/custom-${filename || 'endpoint'}.js`,
      content: generateCustomEndpointCode(ep, schemas),
    });
  });

  return files;
}

module.exports = {
  generateModelCode,
  generateRouteCode,
  generateCustomEndpointCode,
  generateFullProject,
  generateServerEntry,
  generateProjectPackageJson,
  generateEnvExample,
};
