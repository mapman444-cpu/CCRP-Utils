const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

const PREFIX = "-";

function loadCommands(client) {
    // SLASH COMMANDS
    const commandsPath = path.join(__dirname, "../Commands");

    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith(".js"));

        let loadedCount = 0;

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);

            try {
                const command = require(filePath);

                if (command?.data?.name && typeof command.execute === "function") {
                    client.commands.set(command.data.name, command);
                    loadedCount++;
                    console.log(`[SLASH LOADER] Loaded /${command.data.name}`);
                } else {
                    console.warn(`[SLASH LOADER] Skipped ${file}`);
                }
            } catch (error) {
                console.error(`[SLASH LOADER] Failed to load ${file}:`, error);
            }
        }

        console.log(`[SLASH LOADER] Loaded ${loadedCount} command(s).`);
    } else {
        console.warn("[SLASH LOADER] Commands folder not found.");
    }

    // PREFIX COMMANDS
    const possiblePaths = [
        path.join(__dirname, "../Messages"),
        path.join(__dirname, "../messages"),
    ];

    const messagesPath = possiblePaths.find(folder => fs.existsSync(folder));

    if (!client.prefixCommands) {
        client.prefixCommands = new Collection();
    }

    if (!messagesPath) {
        console.warn("[PREFIX LOADER] Messages folder not found.");
        return;
    }

    const messageFiles = fs.readdirSync(messagesPath)
        .filter(file => file.endsWith(".js"));

    let loadedCount = 0;

    for (const file of messageFiles) {
        const filePath = path.join(messagesPath, file);

        try {
            const command = require(filePath);

            if (command?.name && typeof command.run === "function") {
                client.prefixCommands.set(command.name.toLowerCase(), command);
                loadedCount++;

                console.log(`[PREFIX LOADER] Loaded ${PREFIX}${command.name}`);
            } else {
                console.warn(`[PREFIX LOADER] Skipped ${file}`);
            }
        } catch (error) {
            console.error(`[PREFIX LOADER] Failed to load ${file}:`, error);
        }
    }

    console.log(`[PREFIX LOADER] Loaded ${loadedCount} prefix command(s).`);
}

module.exports = { loadCommands };
