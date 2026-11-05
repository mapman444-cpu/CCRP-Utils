const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.js");

const MAIN_GUILD_ID = "1520517822046802120";
const commandsPath = path.join(__dirname, "folders", "Commands");

async function deployCommands() {
  if (!config.token || !config.clientId) {
    throw new Error(
      "Missing token or clientId in config.js."
    );
  }

  if (!fs.existsSync(commandsPath)) {
    throw new Error(`Commands folder not found: ${commandsPath}`);
  }

  const commands = [];
  const files = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  for (const file of files) {
    try {
      const command = require(path.join(commandsPath, file));

      if (command?.data?.toJSON) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(`[DEPLOY] Skipping ${file}: missing command data.`);
      }
    } catch (error) {
      console.error(`[DEPLOY] Failed to load ${file}:`, error);
    }
  }

  const rest = new REST({ version: "10" }).setToken(config.token);

  console.log(
    `Registering ${commands.length} slash command(s) to guild ${MAIN_GUILD_ID}...`
  );

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, MAIN_GUILD_ID),
    { body: commands }
  );

  console.log("Successfully registered slash commands to the CCRP main guild.");
}

deployCommands().catch(error => {
  console.error("[DEPLOY ERROR]", error);
  process.exitCode = 1;
});
