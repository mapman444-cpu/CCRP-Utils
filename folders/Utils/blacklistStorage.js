
const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    reason: {
        type: String,
        required: true,
    },
    moderatorId: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const Blacklist = mongoose.models.GlobalBlacklist ||
    mongoose.model("GlobalBlacklist", blacklistSchema);

function checkDatabase() {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB is not connected. Check your database connection.");
    }
}

async function getUser(userId) {
    checkDatabase();
    return Blacklist.findOne({ userId });
}

async function addUser(userId, reason, moderatorId) {
    checkDatabase();

    return Blacklist.findOneAndUpdate(
        { userId },
        {
            userId,
            reason,
            moderatorId,
            date: new Date(),
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
        }
    );
}

async function removeUser(userId) {
    checkDatabase();

    const result = await Blacklist.deleteOne({ userId });
    return result.deletedCount > 0;
}

async function getAll() {
    checkDatabase();
    return Blacklist.find({});
}

module.exports = {
    getUser,
    addUser,
    removeUser,
    getAll,
};
