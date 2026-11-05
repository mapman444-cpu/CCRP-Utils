const { Schema, model } = require("mongoose");

const schema = new Schema({
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  type: { type: String, required: true }, 
  created: { type: Number, default: Date.now },
});

module.exports = model("Support", schema);
