/**
 * Groq AI Service
 *
 * Takes a natural-language API request and the project's schema context,
 * then returns a structured, validated CustomEndpoint definition.
 *
 * Uses Groq's fast inference API with llama models.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildSchemaContext(schemas) {
  return schemas
    .map((s) => {
      const fields = (s.fields || [])
        .map((f) => {
          let desc = `  - ${f.name}: ${f.fieldType}`;
          if (f.required) desc += ' (required)';
          if (f.unique) desc += ' (unique)';
          if (f.ref) desc += ` -> ref: ${f.ref}`;
          if (f.enumValues && f.enumValues.length > 0)
            desc += ` [enum: ${f.enumValues.join(', ')}]`;
          if (f.fieldType === 'Array' && f.arrayType) desc += ` of ${f.arrayType}`;
          return desc;
        })
        .join('\n');
      return `Collection: ${s.name}\nFields:\n${fields}${s.timestamps ? '\n  - createdAt: Date (auto)\n  - updatedAt: Date (auto)' : ''}`;
    })
    .join('\n\n');
}

function buildSystemPrompt(schemas) {
  const schemaContext = buildSchemaContext(schemas);
  const allCollections = schemas.map((s) => s.name);
  const allFields = {};
  schemas.forEach((s) => {
    allFields[s.name] = (s.fields || []).map((f) => f.name);
    if (s.timestamps) {
      allFields[s.name].push('createdAt', 'updatedAt');
    }
  });

  return `You are a senior backend architect designing production-grade API endpoints.

DATABASE SCHEMAS:
${schemaContext}

AVAILABLE COLLECTIONS: ${allCollections.join(', ')}

AVAILABLE FIELDS PER COLLECTION:
${Object.entries(allFields)
  .map(([col, fields]) => `${col}: ${fields.join(', ')}`)
  .join('\n')}

RULES:
1. ONLY use collections and fields that exist above. Never invent fields.
2. Output MUST be a single valid JSON object matching the exact structure below.
3. path must start with /api/custom/ and use lowercase kebab-case.
4. Every filter field must exist in the source collection.
5. Every outputField must exist in the source collection.
6. aggregation field must exist unless operation is "count".
7. groupBy field must exist in the source collection.
8. Add safetyNotes for any performance or security concerns.
9. Always include pagination for list endpoints.
10. Set maxLimit to 100 maximum.
11. For aggregation endpoints, set pagination.enabled to false.

OUTPUT JSON STRUCTURE (respond ONLY with this JSON, no explanation):
{
  "name": "string - short endpoint name",
  "description": "string - one sentence purpose",
  "method": "GET or POST",
  "path": "/api/custom/kebab-case-path",
  "sourceCollection": "exact collection name from schemas",
  "outputFields": ["field1", "field2"],
  "filters": [
    {
      "field": "fieldName",
      "operator": "eq|ne|gt|gte|lt|lte|in|nin|regex|exists|between",
      "valueSource": "query|static",
      "staticValue": null,
      "description": "what this filter does"
    }
  ],
  "sort": { "field": "fieldName", "order": "asc|desc" },
  "pagination": { "enabled": true, "defaultLimit": 20, "maxLimit": 100 },
  "aggregations": [
    { "operation": "count|sum|avg|min|max", "field": "fieldName", "alias": "resultName" }
  ],
  "groupBy": "",
  "auth": { "required": false, "roles": [] },
  "cache": { "enabled": false, "ttlSeconds": 60 },
  "safetyNotes": ["note1", "note2"]
}`;
}

async function generateEndpointDefinition(prompt, schemas, groqApiKey) {
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const systemPrompt = buildSystemPrompt(schemas);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error (${response.status}): ${err.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Groq API');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Groq returned invalid JSON');
  }

  // Validate against actual schemas
  const validationErrors = validateEndpoint(parsed, schemas);
  if (validationErrors.length > 0) {
    return {
      endpoint: parsed,
      warnings: validationErrors,
      valid: false,
    };
  }

  return {
    endpoint: parsed,
    warnings: [],
    valid: true,
  };
}

function validateEndpoint(endpoint, schemas) {
  const errors = [];
  const collectionNames = schemas.map((s) => s.name);

  // Validate source collection
  if (!endpoint.sourceCollection) {
    errors.push('Missing sourceCollection');
  } else if (!collectionNames.includes(endpoint.sourceCollection)) {
    errors.push(
      `Collection "${endpoint.sourceCollection}" does not exist. Available: ${collectionNames.join(', ')}`
    );
  }

  const schema = schemas.find((s) => s.name === endpoint.sourceCollection);
  if (!schema) return errors;

  const validFields = (schema.fields || []).map((f) => f.name);
  if (schema.timestamps !== false) {
    validFields.push('createdAt', 'updatedAt');
  }
  validFields.push('_id');

  // Validate output fields
  (endpoint.outputFields || []).forEach((field) => {
    if (!validFields.includes(field)) {
      errors.push(`Output field "${field}" does not exist in ${endpoint.sourceCollection}`);
    }
  });

  // Validate filter fields
  (endpoint.filters || []).forEach((filter) => {
    if (!validFields.includes(filter.field)) {
      errors.push(`Filter field "${filter.field}" does not exist in ${endpoint.sourceCollection}`);
    }
  });

  // Validate sort field
  if (endpoint.sort?.field && !validFields.includes(endpoint.sort.field)) {
    errors.push(`Sort field "${endpoint.sort.field}" does not exist in ${endpoint.sourceCollection}`);
  }

  // Validate groupBy
  if (endpoint.groupBy && !validFields.includes(endpoint.groupBy)) {
    errors.push(`GroupBy field "${endpoint.groupBy}" does not exist in ${endpoint.sourceCollection}`);
  }

  // Validate aggregation fields
  (endpoint.aggregations || []).forEach((agg) => {
    if (agg.operation !== 'count' && agg.field && !validFields.includes(agg.field)) {
      errors.push(`Aggregation field "${agg.field}" does not exist in ${endpoint.sourceCollection}`);
    }
  });

  // Validate path
  if (!endpoint.path || !endpoint.path.startsWith('/api/custom/')) {
    errors.push('Path must start with /api/custom/');
  }

  // Validate pagination limits
  if (endpoint.pagination?.maxLimit > 100) {
    errors.push('maxLimit cannot exceed 100');
  }

  return errors;
}

module.exports = {
  generateEndpointDefinition,
  validateEndpoint,
  buildSchemaContext,
};
