
const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");

const sendToRegisteredServers = require("../Utils/sendToRegisteredServers");

const MAIN_GUILD_ID = "1520517822046802120";
const headerImage = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330391206494340/Session_Start_4.png?backend=b2&ex=6ae75da0&is=6ae60c20&hm=ca8201f162bed1cb84276db874c61bfb1c9b806d92d28e8722540cefcf3b8366&";

module.exports = {
    roles: ["1520985263357300928"],

    data: new SlashCommandBuilder()
        .setName("session-start")
        .setDescription("Host a session start up."),

    async execute(interaction, client) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        try {
            const serverName = "Chicago City Roleplay | VC Only";
            const serverOwner = "Santa201054";
            const joinCode = "CCRPNEWVC";

            const roleIds = [
                "1538950575192809492",
                "1520984853104037898",
            ].filter(Boolean);

            if (!client.voteMap) {
                client.voteMap = new Map();
            }

            const voters = client.activePollId
                ? client.voteMap.get(client.activePollId)
                : null;

            const voterIds = voters
                ? [...voters.values()].map(voter => voter.userId)
                : [];

            const votersList = voterIds.length
                ? voterIds.map(id => `<@${id}>`).join(", ")
                : "**No voters!**";

            // Build one announcement container for both servers.
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
                        "# Chicago City Roleplay Session Startup",
                        "> A server start-up has been initiated! Please ensure you have read and understood our regulations prior to joining.",
                        "",
                        "## Game Information",
                        `> **Server Name:** ${serverName}`,
                        `> **Server Owner:** ${serverOwner}`,
                        `> **Join Code:** ${joinCode}`,
                    ].join("\n"))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Session Voters\n > ${votersList}\n > Voters are required to join to avoid facing moderation actions!`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel("Quick Join")
                            .setURL(`https://erlc.gg/join?code=${joinCode}`)
                            .setStyle(ButtonStyle.Link)
                    )
                );

            // Get the main server's configured startup channel.
            const mainChannelId =
                client.config?.sessionChannelsByGuild?.[MAIN_GUILD_ID]?.start;

            if (!mainChannelId) {
                throw new Error(
                    "No startup channel configured for the main server in config.js."
                );
            }

            const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
            const mainChannel = await mainGuild.channels.fetch(mainChannelId);

            if (!mainChannel?.isTextBased() || !mainChannel.send) {
                throw new Error("The main session channel is invalid.");
            }

            // Main server: role pings plus the shared announcement and image.
            const mainComponents = [];

            if (roleIds.length > 0) {
                mainComponents.push(
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            roleIds.map(id => `<@&${id}>`).join(" ")
                        )
                    )
                );
            }

            mainComponents.push(container);

            await mainChannel.send({
                components: mainComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    roles: roleIds,
                },
            });

            // Other registered servers: same announcement and image, no role pings.
            await sendToRegisteredServers(
                client,
                container,
                "start"
            );

            // Delete the previous vote announcement from the main server.
            if (client.activePollMessageId) {
                try {
                    const pollMessage = await mainChannel.messages.fetch(
                        client.activePollMessageId
                    );

                    await pollMessage.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error(
                            "Failed to delete the session vote poll:",
                            error
                        );
                    }
                }

                client.activePollMessageId = null;
            }

            client.sessionStatus = "online";

            if (typeof client.refreshSessionPanel === "function") {
                await client.refreshSessionPanel();
            }

            await interaction.editReply({
                content: "Successfully hosted a session start-up!",
            });

        } catch (error) {
            console.error("Error executing /session-start:", error);

            await interaction.editReply({
                content: `The session startup failed: ${error.message}`.slice(
                    0,
                    2000
                ),
            }).catch(() => {});
        }
    },
};
