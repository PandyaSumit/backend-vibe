const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fieldType: {
      type: String,
      required: true,
      enum: [
        'String',
        'Number',
        'Boolean',
        'Date',
        'ObjectId',
        'Array',
        'Mixed',
      ],
    },
    required: {
      type: Boolean,
      default: false,
    },
    unique: {
      type: Boolean,
      default: false,
    },
    default: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    ref: {
      type: String,
      default: '',
    },
    enumValues: {
      type: [String],
      default: [],
    },
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    arrayType: {
      type: String,
      enum: ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Mixed', ''],
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const schemaDefinitionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    collectionName: {
      type: String,
      trim: true,
      default: '',
    },
    fields: [fieldSchema],
    timestamps: {
      type: Boolean,
      default: true,
    },
    generateCrud: {
      type: Boolean,
      default: true,
    },
    endpoints: {
      getAll: { type: Boolean, default: true },
      getById: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

schemaDefinitionSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SchemaDefinition', schemaDefinitionSchema);
