const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../services/encryption');

const projectSettingsSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
    },
    groqApiKeyEncrypted: {
      type: String,
      default: '',
    },
    sandboxEnabled: {
      type: Boolean,
      default: true,
    },
    sandboxCollectionPrefix: {
      type: String,
      default: 'sandbox_',
    },
  },
  { timestamps: true }
);

// Virtual getter for decrypted key (never stored in plain text)
projectSettingsSchema.methods.getGroqApiKey = function () {
  return decrypt(this.groqApiKeyEncrypted);
};

// Setter that encrypts before saving
projectSettingsSchema.methods.setGroqApiKey = function (plainKey) {
  this.groqApiKeyEncrypted = plainKey ? encrypt(plainKey) : '';
};

module.exports = mongoose.model('ProjectSettings', projectSettingsSchema);
