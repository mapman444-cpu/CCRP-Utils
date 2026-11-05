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
const headerImage = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330547519815811/Session_Full_3.png?backend=b2&ex=6ae75dc5&is=6ae60c45&hm=ed90a4f3e069ae34514fb82da2028487b0cc3db0f86e21cfee14a647fdd121ed&";

module.exports = {
    roles: ["1520985263357300928"],

    data: new SlashCommandBuilder()
        .setName("session-full")
        .setDescription("Send the session full message."),

    async execute(interaction, client) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        try {
            const timestamp = `<t:${Math.floor(Date.now() / 1000)}:R>`;
            const joinCode = "CCRPNEWVC";

            // Build the shared announcement container.
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
                        "# Chicago City Roleplay Session Full",
                        `> The session has been full since **${timestamp}**.`,
                        "> Keep trying to join us for some great roleplays!",
                        "",
                        "> **Server Name:** Chicago City Roleplay",
                        "> **Server Owner:** Server owner",
                        `> **Join Code:** ${joinCode}`,
                    ].join("\n"))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel("Quick Join")
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://erlc.gg/join?code=${joinCode}`)
                    )
                );

            // Get the main server's configured full channel.
            const mainChannelId =
                client.config?.sessionChannelsByGuild?.[MAIN_GUILD_ID]?.full;

            if (!mainChannelId) {
                throw new Error(
                    "No session-full channel configured for the main server in config.js."
                );
            }

            const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
            const mainChannel = await mainGuild.channels.fetch(mainChannelId);

            if (!mainChannel?.isTextBased() || !mainChannel.send) {
                throw new Error("The main session-full channel is invalid.");
            }

            // Send to the main server.
            await mainChannel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                },
            });

            // Send the same announcement, including the banner, to other registered servers.
            await sendToRegisteredServers(
                client,
                container,
                "full"
            );

            await interaction.editReply({
                content: "Session has been marked as full!",
            });

        } catch (error) {
            console.error("Failed to send session full message:", error);

            await interaction.editReply({
                content: `There was an error sending the session-full message: ${error.message}`.slice(
                    0,
                    2000
                ),
            }).catch(() => {});
        }
    },
};