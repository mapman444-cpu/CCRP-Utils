const { Schema, model, models } = require("mongoose");

const schema = new Schema({
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  staffId: { type: String, default: null },
  messageId: { type: String, default: null },
  type: { type: String, required: true },
  created: { type: Number, default: Date.now },
});

module.exports = models.assistance || model("assistance", schema);

  