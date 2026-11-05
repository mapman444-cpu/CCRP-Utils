const fs = require("fs");
const path = require("path");

const pidFile = path.join(__dirname, ".bot.pid");

if (!fs.existsSync(pidFile)) {
    console.log("Bot isn't running or no PID file was found.");
    process.exit(1);
}

const pid = Number(fs.readFileSync(pidFile, "utf8").trim());

if (!Number.isInteger(pid) || pid <= 0) {
    console.log("Invalid bot process ID.");
    process.exit(1);
}

try {
    process.kill(pid);
    fs.unlinkSync(pidFile);

    console.log("Chicago Utilities has been shut down.");
} catch (error) {
    console.log("Couldn't stop the bot:", error.message);
}