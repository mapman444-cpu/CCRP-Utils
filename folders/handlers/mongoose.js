const mongoose = require("mongoose");
const config = require("../../config.js");

module.exports = async () => {
  if (!config.mongoDBUri) {
    console.warn(
      "[DATABASE WARNING] No MongoDB URI provided in config.js."
    );
    return false;
  }

  try {
    mongoose.set("strictQuery", false);

    await mongoose.connect(config.mongoDBUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("[DATABASE] Successfully connected to MongoDB.");
    return true;
  } catch (error) {
    console.error(
      "[DATABASE] Database connection failed:",
      error.message
    );

    return false;
  }
};
