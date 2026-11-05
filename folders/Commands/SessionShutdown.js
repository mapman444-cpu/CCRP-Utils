const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
} = require("discord.js");

const SessionsModel = require("../Database/Models/SessionModel.js");
const sendToRegisteredServers = require("../Utils/sendToRegisteredServers");

const MAIN_GUILD_ID = "1520517822046802120";
const notificationRoleId = "1538950575192809492";
const headerImage = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330559930769488/Session_Shutdown_5.png?backend=b2&ex=6ae75dc8&is=6ae60c48&hm=b6a1aec1c7565fc6253781fb4a22a2f6d497e5d8366a691de8539289a3a18559&";

module.exports = {
    roles: ["1520985263357300928"],

    data: new SlashCommandBuilder()
        .setName("session-shutdown")
        .setDescription("Host a session shutdown."),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            console.error("Failed to acknowledge /session-shutdown:", error);
            return;
        }

        try {
            // Get the main server's configured shutdown channel.
            const channelId =
                client.config?.sessionChannelsByGuild?.[MAIN_GUILD_ID]?.shutdown;

            if (!channelId) {
                throw new Error(
                    "No shutdown channel configured for the main server in config.js."
                );
            }

            const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
            const channel = await mainGuild.channels.fetch(channelId);

            if (!channel?.isTextBased() || !channel.messages || !channel.send) {
                throw new Error("The main server's shutdown channel is invalid.");
            }

            // Find the saved session panel.
            const savedSession = await SessionsModel.findOne({
                channelId,
            }).lean();

            const protectedPanelId = savedSession?.messageId;

            // Build the shared shutdown announcement.
            const container = new ContainerBuilder()
                .setAccentColor(0x37373E);

            // Add the banner before the announcement content.
if (headerImage) {
    container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
                .setURL(headerImage)
                .setDescription("Chicago City Roleplay banner")
        )
    );
}

            container
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent([
                        "# Chicago City Roleplay Session Shutdown",
                        "",
                        "> The in-game server is currently shut down. Please refrain from attempting to join during this time.",
                        "",
                        notificationRoleId
                            ? `> Be sure to obtain the <@&${notificationRoleId}> role to be notified about the next session!`
                            : "> Be sure to obtain the session notification role to be notified about the next session!",
                        "",
                        "# Thanks for a great session! We will be back soon!",
                    ].join("\n"))
                )
                .addSeparatorComponents(new SeparatorBuilder());

            // Send to the main server.
            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                },
            });

            // Send the same announcement, including its image, to other registered servers.
            await sendToRegisteredServers(
                client,
                container,
                "shutdown"
            );

            client.sessionStatus = "offline";

            if (typeof client.refreshSessionPanel === "function") {
                try {
                    await client.refreshSessionPanel();
                } catch (error) {
                    console.error("Failed to refresh the session panel:", error);
                }
            }

            await interaction.editReply({
                content: "Successfully shut down the in-game server.",
            });

            // Delete older session announcements in the main channel.
            // Preserve the saved session panel.
            const sessionKeywords = [
                "chicago city roleplay session startup",
                "chicago city roleplay session start-up",
                "chicago city roleplay session boost",
                "chicago city roleplay session full",
                "chicago city roleplay session vote",
            ];

            let before;
            let deletedCount = 0;
            let scannedCount = 0;

            const maxMessagesToScan = 500;

            while (scannedCount < maxMessagesToScan) {
                const remaining = maxMessagesToScan - scannedCount;

                const options = {
                    limit: Math.min(100, remaining),
                };

                if (before) {
                    options.before = before;
                }

                const messages = await channel.messages.fetch(options);

                if (messages.size === 0) break;

                before = messages.last().id;
                scannedCount += messages.size;

                for (const message of messages.values()) {
                    if (message.author.id !== client.user.id) continue;

                    if (
                        protectedPanelId &&
                        message.id === protectedPanelId
                    ) {
                        continue;
                    }

                    const componentText = message.components
                        .map(component => JSON.stringify(component.toJSON()))
                        .join(" ");

                    const embedText = message.embeds
                        .map(embed => JSON.stringify(embed.toJSON()))
                        .join(" ");

                    const searchableText = [
                        message.content,
                        componentText,
                        embedText,
                    ].join(" ").toLowerCase();

                    const isSessionAnnouncement = sessionKeywords.some(
                        keyword => searchableText.includes(keyword)
                    );

                    if (!isSessionAnnouncement) continue;

                    try {
                        await message.delete();
                        deletedCount++;
                    } catch (error) {
                        console.error(
                            `Could not delete session message ${message.id}:`,
                            error.message
                        );
                    }
                }

                if (messages.size < options.limit) break;
            }

            console.log(
                `Session shutdown completed. Scanned ${scannedCount} messages and deleted ${deletedCount} old session announcements.`
            );

        } catch (error) {
            console.error("Error executing /session-shutdown:", error);

            await interaction.editReply({
                content: `The session shutdown failed: ${error.message}`.slice(
                    0,
                    2000
                ),
            }).catch(() => {});
        }
    },
};