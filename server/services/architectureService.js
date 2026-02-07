/**
 * Architecture Generator Service
 *
 * Takes a natural-language backend description and generates:
 * 1. Complete schema definitions (entities, fields, relationships)
 * 2. Canvas layout metadata (positions, edges) for visual rendering
 *
 * Uses Groq's fast inference API.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a senior backend architect. The user will describe their backend requirements in natural language. You must design a complete, production-ready backend architecture.

DATABASE: MongoDB with Mongoose
FIELD TYPES ALLOWED: String, Number, Boolean, Date, ObjectId, Array, Mixed

RULES:
1. Design normalized entities with proper relationships
2. Use ObjectId with ref for relationships between entities
3. Include proper field types, constraints (required, unique), defaults
4. Add timestamps (createdAt, updatedAt) to all entities
5. Enable CRUD for all entities
6. Infer roles and permissions if applicable
7. Make reasonable assumptions for anything unclear
8. Create 2-8 entities depending on complexity
9. Each entity should have 3-12 fields (not counting _id and timestamps)
10. For references, the "ref" value must exactly match another entity name

VISUAL LAYOUT RULES:
- Position entities in a clean grid layout
- Related entities should be placed near each other
- Use x,y coordinates starting from 0,0
- Space entities 320px apart horizontally, 280px apart vertically
- Typical node width: 280, height varies by field count (base 120 + 32 per field)

OUTPUT: Return ONLY a valid JSON object with this exact structure:

{
  "entities": [
    {
      "name": "EntityName",
      "description": "One sentence purpose",
      "collectionName": "",
      "timestamps": true,
      "generateCrud": true,
      "fields": [
        {
          "name": "fieldName",
          "fieldType": "String|Number|Boolean|Date|ObjectId|Array|Mixed",
          "required": false,
          "unique": false,
          "default": "",
          "ref": "",
          "enumValues": [],
          "arrayType": "",
          "minLength": null,
          "maxLength": null,
          "min": null,
          "max": null,
          "description": ""
        }
      ],
      "canvas": {
        "x": 0,
        "y": 0,
        "width": 280,
        "height": 200
      }
    }
  ],
  "relationships": [
    {
      "from": "EntityName",
      "fromField": "fieldName",
      "to": "ReferencedEntity",
      "type": "many-to-one|one-to-many|many-to-many",
      "label": "short description"
    }
  ]
}`;

async function generateArchitecture(prompt, groqApiKey) {
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
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

  // Validate and fix the architecture
  const result = validateAndFixArchitecture(parsed);
  return result;
}

function validateAndFixArchitecture(arch) {
  const warnings = [];
  const entities = arch.entities || [];
  const entityNames = entities.map((e) => e.name);

  // Validate and fix each entity
  entities.forEach((entity, idx) => {
    if (!entity.name) {
      entity.name = `Entity${idx + 1}`;
      warnings.push(`Entity ${idx} had no name, assigned "${entity.name}"`);
    }

    entity.timestamps = entity.timestamps !== false;
    entity.generateCrud = entity.generateCrud !== false;

    // Fix canvas positions if missing
    if (!entity.canvas) {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      entity.canvas = {
        x: col * 320,
        y: row * 280,
        width: 280,
        height: 120 + (entity.fields || []).length * 32,
      };
    }

    // Validate fields
    (entity.fields || []).forEach((field) => {
      const validTypes = ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Array', 'Mixed'];
      if (!validTypes.includes(field.fieldType)) {
        field.fieldType = 'String';
        warnings.push(`${entity.name}.${field.name}: invalid type, defaulted to String`);
      }

      // Fix refs pointing to non-existent entities
      if (field.fieldType === 'ObjectId' && field.ref && !entityNames.includes(field.ref)) {
        warnings.push(
          `${entity.name}.${field.name}: ref "${field.ref}" does not match any entity`
        );
      }

      // Ensure defaults for optional fields
      if (field.required === undefined) field.required = false;
      if (field.unique === undefined) field.unique = false;
      if (!field.enumValues) field.enumValues = [];
      if (!field.default && field.default !== 0 && field.default !== false) field.default = '';
      if (!field.ref) field.ref = '';
      if (!field.arrayType) field.arrayType = '';
      if (!field.description) field.description = '';
    });
  });

  // Validate relationships
  const relationships = (arch.relationships || []).filter((rel) => {
    if (!entityNames.includes(rel.from)) {
      warnings.push(`Relationship from "${rel.from}" references unknown entity`);
      return false;
    }
    if (!entityNames.includes(rel.to)) {
      warnings.push(`Relationship to "${rel.to}" references unknown entity`);
      return false;
    }
    return true;
  });

  return {
    entities,
    relationships,
    warnings,
  };
}

module.exports = {
  generateArchitecture,
};
