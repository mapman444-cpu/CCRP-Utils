
const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CATEGORY_TYPES = {
    general: "General",
    internal: "Internal",
    management: "Management",
    partnership: "Partnership",
};

const foldersPath = path.join(__dirname, "../../");
const commandsPath = path.join(foldersPath, "Commands");
const buttonsPath = path.join(foldersPath, "Buttons");
const modalsPath = path.join(foldersPath, "Modals");

// Load handlers once when this event file is loaded.
function loadHandlers(folderPath, type) {
    const handlers = new Map();

    if (!fs.existsSync(folderPath)) {
        console.warn(`[${type} LOADER] Folder not found: ${folderPath}`);
        return handlers;
    }

    const files = fs.readdirSync(folderPath).filter(file =>
        file.endsWith(".js")
    );

    for (const file of files) {
        try {
            const filePath = path.join(folderPath, file);
            const handler = require(filePath);

            if (handler.customID && typeof handler.execute === "function") {
                handlers.set(handler.customID, handler);
            } else {
                console.warn(
                    `[${type} LOADER] Skipped ${file}: missing customID or execute().`
                );
            }
        } catch (error) {
            console.error(
                `[${type} LOADER] Failed to load ${file}:`,
                error
            );
        }
    }

    console.log(
        `[${type} LOADER] Loaded ${handlers.size} ${type.toLowerCase()} handler(s).`
    );

    for (const handlerId of handlers.keys()) {
        console.log(`  - ${handlerId}`);
    }

    return handlers;
}

const buttonHandlers = loadHandlers(buttonsPath, "BUTTON");
const modalHandlers = loadHandlers(modalsPath, "MODAL");

function getHandlerAndArgs(customId, handlers) {
    if (handlers.has(customId)) {
        return {
            handler: handlers.get(customId),
            args: [],
        };
    }

    const separatorIndex = customId.lastIndexOf("_");

    if (separatorIndex === -1) {
        return {
            handler: null,
            args: [],
        };
    }

    const baseId = customId.slice(0, separatorIndex);
    const argument = customId.slice(separatorIndex + 1);

    return {
        handler: handlers.get(baseId) || null,
        args: [argument],
    };
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        try {
            // ROLE REQUEST ROLE SELECT MENU
            if (
                interaction.isRoleSelectMenu() &&
                interaction.customId.startsWith("rr_select_roles_")
            ) {
                const commandPath = path.join(
                    commandsPath,
                    "role-request.js"
                );

                if (!fs.existsSync(commandPath)) {
                    console.error("role-request.js was not found.");

                    return interaction.reply({
                        content: "Role request command file was not found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const roleRequestCommand = require(commandPath);

                if (
                    typeof roleRequestCommand.handleComponentInteraction !== "function"
                ) {
                    console.error(
                        "role-request.js is missing handleComponentInteraction()."
                    );

                    return interaction.reply({
                        content: "The role request system is not configured correctly.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                return await roleRequestCommand.handleComponentInteraction(
                    interaction
                );
            }

            // SLASH COMMANDS
            if (interaction.isChatInputCommand()) {
                const command =
                    client.slashCommands?.get(interaction.commandName) ||
                    client.commands?.get(interaction.commandName);

                if (!command) {
                    console.warn(
                        `Slash command not found: ${interaction.commandName}`
                    );
                    return;
                }

                if (typeof command.execute === "function") {
                    return await command.execute(interaction, client);
                }

                if (typeof command.run === "function") {
                    return await command.run(client, interaction);
                }

                console.warn(
                    `Slash command ${interaction.commandName} has no execute() or run() method.`
                );

                return;
            }

            // TICKET CATEGORY MENU
            if (
                interaction.isStringSelectMenu() &&
                interaction.customId === "support:menu"
            ) {
                const selectedValue = String(
                    interaction.values?.[0] || ""
                ).trim();

                const category =
                    CATEGORY_TYPES[selectedValue.toLowerCase()];

                if (!category) {
                    return interaction.reply({
                        content: "Invalid ticket category.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`support:ticketreason_${category}`)
                    .setTitle(`${category} Support Ticket`);

                const reasonInput = new TextInputBuilder()
                    .setCustomId("reason")
                    .setLabel("How can we help you?")
                    .setPlaceholder(
                        "Explain the reason for opening this ticket."
                    )
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1500);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(reasonInput)
                );

                return await interaction.showModal(modal);
            }

            // ROLE APPROVAL SELECT MENU
            if (
                interaction.isStringSelectMenu() &&
                interaction.customId.startsWith("rr_approve_roles_")
            ) {
                const { handler, args } = getHandlerAndArgs(
                    interaction.customId,
                    buttonHandlers
                );

                if (!handler) {
                    console.warn(
                        `Approval handler not found: ${interaction.customId}`
                    );

                    return interaction.reply({
                        content: "The approval handler could not be found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                return await handler.execute(
                    interaction,
                    client,
                    args
                );
            }

            // TICKET CLOSURE REASON MODAL
            if (
                interaction.isModalSubmit() &&
                interaction.customId === "closeSupport:reason"
            ) {
                const reason = interaction.fields
                    .getTextInputValue("reason")
                    .trim();

                if (!reason) {
                    return interaction.reply({
                        content: "Please provide a closure reason.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const closeHandlerPath = path.join(
                    buttonsPath,
                    "closeSupport.js"
                );

                if (!fs.existsSync(closeHandlerPath)) {
                    console.error("closeSupport.js was not found.");

                    return interaction.reply({
                        content: "The ticket closure handler was not found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const closeHandler = require(closeHandlerPath);

                if (typeof closeHandler.closeTicket !== "function") {
                    console.error(
                        "closeSupport.js is missing closeTicket()."
                    );

                    return interaction.reply({
                        content: "The ticket closure handler is not configured correctly.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                return await closeHandler.closeTicket(
                    interaction,
                    client,
                    reason
                );
            }

            // BUTTONS
            if (interaction.isButton()) {
                const { handler, args } = getHandlerAndArgs(
                    interaction.customId,
                    buttonHandlers
                );

                if (!handler) {
                    console.warn(
                        `Button handler not found: ${interaction.customId}`
                    );

                    return interaction.reply({
                        content: "This button handler could not be found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                return await handler.execute(
                    interaction,
                    client,
                    args
                );
            }

            // MODALS
            if (interaction.isModalSubmit()) {
                const { handler, args } = getHandlerAndArgs(
                    interaction.customId,
                    modalHandlers
                );

                if (!handler) {
                    console.warn(
                        `Modal handler not found: ${interaction.customId}`
                    );

                    return interaction.reply({
                        content: "This modal handler could not be found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                return await handler.execute(
                    interaction,
                    client,
                    args
                );
            }

        } catch (error) {
            console.error("InteractionCreate error:", error);

            if (!interaction.isRepliable()) return;

            const errorMessage = {
                content: "An error occurred while processing this interaction.",
                flags: MessageFlags.Ephemeral,
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(errorMessage).catch(() => {});
            } else {
                await interaction.reply(errorMessage).catch(() => {});
            }
        }
    },
};
