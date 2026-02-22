const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      required: true,
      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex', 'exists', 'between'],
    },
    valueSource: {
      type: String,
      enum: ['query', 'static'],
      default: 'query',
    },
    staticValue: mongoose.Schema.Types.Mixed,
    description: { type: String, default: '' },
  },
  { _id: false }
);

const aggregationSchema = new mongoose.Schema(
  {
    operation: {
      type: String,
      required: true,
      enum: ['count', 'sum', 'avg', 'min', 'max'],
    },
    field: { type: String, default: '' },
    alias: { type: String, required: true },
  },
  { _id: false }
);

const customEndpointSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: '',
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST'],
      default: 'GET',
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    sourceCollection: {
      type: String,
      required: true,
    },
    // Fields to return (projection)
    outputFields: {
      type: [String],
      default: [],
    },
    // Filter definitions
    filters: [filterSchema],
    // Sorting
    sort: {
      field: { type: String, default: '' },
      order: { type: String, enum: ['asc', 'desc', ''], default: '' },
    },
    // Pagination
    pagination: {
      enabled: { type: Boolean, default: true },
      defaultLimit: { type: Number, default: 20 },
      maxLimit: { type: Number, default: 100 },
    },
    // Aggregation pipeline
    aggregations: [aggregationSchema],
    // Grouping
    groupBy: {
      type: String,
      default: '',
    },
    // Auth / scope
    auth: {
      required: { type: Boolean, default: false },
      roles: { type: [String], default: [] },
    },
    // Caching
    cache: {
      enabled: { type: Boolean, default: false },
      ttlSeconds: { type: Number, default: 60 },
    },
    // Safety
    safetyNotes: {
      type: [String],
      default: [],
    },
    // AI prompt that generated this
    sourcePrompt: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

customEndpointSchema.index({ project: 1, path: 1, method: 1 }, { unique: true });

module.exports = mongoose.model('CustomEndpoint', customEndpointSchema);
