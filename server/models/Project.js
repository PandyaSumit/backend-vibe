const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    dbName: {
      type: String,
      trim: true,
      default: '',
    },
    port: {
      type: Number,
      default: 3000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
