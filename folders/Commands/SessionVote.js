
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

const crypto = require("crypto");
const sendToRegisteredServers = require("../Utils/sendToRegisteredServers");

const MAIN_GUILD_ID = "1520517822046802120";
const headerImage = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330396889907211/Session_Vote_3.png?backend=b2&ex=6ae75da1&is=6ae60c21&hm=831b1dc399abaa4ab7ab7c3fef080264db207fcef2fd0a4f6dd729b0b6a60567&";

module.exports = {
    roles: ["1520985263357300928"],

    data: new SlashCommandBuilder()
        .setName("session-vote")
        .setDescription("Host a session vote."),

    generateSessionId() {
        return crypto.randomBytes(6).toString("hex");
    },

    async execute(interaction, client) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        try {
            const pollSessionId = this.generateSessionId();

            // Build the announcement, including the banner image.
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
                        "# Chicago City Roleplay Session Vote",
                        "> A session vote has been initiated! Click the **Vote** button below to show our staff that you are interested in joining the session!",
                        "> Make sure to read over our rules prior to joining.",
                        "> Required vote count: **10**"
                    ].join("\n"))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`vote:button_${pollSessionId}`)
                            .setLabel("Vote")
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId(`viewvote:button_${pollSessionId}`)
                            .setLabel("View Voters")
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

            // Role IDs to ping in the main server only.
            const roleIds = [
                "1538950575192809492",
                "1520984853104037898",
            ].filter(Boolean);

            // Get the main server's configured vote channel.
            const mainChannelId =
                client.config?.sessionChannelsByGuild?.[MAIN_GUILD_ID]?.vote;

            if (!mainChannelId) {
                throw new Error(
                    "No vote channel configured for the main server in config.js."
                );
            }

            const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
            const mainChannel = await mainGuild.channels.fetch(mainChannelId);

            if (!mainChannel?.isTextBased() || !mainChannel.send) {
                throw new Error(
                    "The main server's vote channel is invalid."
                );
            }

            // Main server: role pings plus the announcement and image.
            const mainMessageComponents = [];

            if (roleIds.length > 0) {
                mainMessageComponents.push(
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            roleIds.map(id => `<@&${id}>`).join(" ")
                        )
                    )
                );
            }

            mainMessageComponents.push(container);

            const pollMessage = await mainChannel.send({
                components: mainMessageComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    roles: roleIds,
                },
            });

            // Secondary servers: same announcement and image, without role pings.
            await sendToRegisteredServers(
                client,
                container,
                "vote"
            );

            // Save active poll details for the button handlers.
            client.activePollId = pollSessionId;
            client.activePollMessageId = pollMessage.id;

            if (!client.voteMap) {
                client.voteMap = new Map();
            }

            client.voteMap.set(pollSessionId, new Map());

            await interaction.editReply({
                content: "Successfully sent a session vote.",
            });

        } catch (error) {
            console.error("Error executing /ssu-vote:", error);

            await interaction.editReply({
                content: `Failed to host a session vote: ${error.message}`.slice(
                    0,
                    2000
                ),
            }).catch(() => {});
        }
    },
};
