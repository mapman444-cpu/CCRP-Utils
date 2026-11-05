const {
  Client,
  Collection,
  GatewayIntentBits,
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

const config = require("./config.js");
const connectDB = require("./folders/handlers/mongoose.js");
const { loadCommands } = require("./folders/handlers/commandLoader.js");
const { loadEvents } = require("./folders/handlers/eventLoader.js");

// Render port / HTTP server
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain",
  });

  res.end("Chicago Utilities is running!");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

// Save the bot's process ID so shutdown.js can stop it.
const pidFile = path.join(__dirname, ".bot.pid");
fs.writeFileSync(pidFile, String(process.pid));

process.on("exit", () => {
  try {
    if (fs.existsSync(pidFile)) {
      const savedPid = Number(
        fs.readFileSync(pidFile, "utf8").trim()
      );

      if (savedPid === process.pid) {
        fs.unlinkSync(pidFile);
      }
    }
  } catch {}
});

const PREFIX = "-";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.config = config;
client.commands = new Collection();
client.prefixCommands = new Collection();
client.cooldowns = new Collection();

// Prefix command handler
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = client.prefixCommands.get(commandName);
  if (!command) return;

  try {
    await command.run(client, message, args);
  } catch (error) {
    console.error(`[PREFIX COMMAND] Error in -${commandName}:`, error);

    if (message.channel.isSendable()) {
      await message.reply("There was an error executing that command.")
        .catch(() => {});
    }
  }
});

(async () => {
  try {
    // Connect to MongoDB, but don't prevent login if the database is unavailable.
    try {
      await connectDB();
    } catch (error) {
      console.warn("[DATABASE WARNING] Continuing without MongoDB:", error.message);
    }

    await loadCommands(client);
    await loadEvents(client);

    await client.login(config.token);
  } catch (error) {
    console.error("Failed to start the bot:", error);
    process.exitCode = 1;
  }
})();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
