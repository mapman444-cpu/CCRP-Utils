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
const headerImage = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330553974857738/Session_Low_3.png?backend=b2&ex=6ae75dc7&is=6ae60c47&hm=dd3ffb4fe1af5ed6099fe4608f26332a3aff2a625d1b9a399bf3cea052d01ae1&";

module.exports = {
    roles: ["1520985263357300928"],

    data: new SlashCommandBuilder()
        .setName("session-boost")
        .setDescription("Sends a boost ping."),

    async execute(interaction, client) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        try {
            const roleIds = [
                "1538950575192809492",
                "1520984853104037898",
            ].filter(Boolean);

            // Build the shared announcement container.
            const container = new ContainerBuilder()
                .setAccentColor(0x37373E);

            // Add the banner to the shared announcement.
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
                        "# Chicago City Roleplay Session Boost",
                        "> The in-game server count is currently **low**.",
                        "> Join up to skip the queue and participate in some roleplays!",
                    ].join("\n"))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel("Quick Join")
                            .setURL("https://erlc.gg/join?code=CCRPNEWVC")
                            .setStyle(ButtonStyle.Link)
                    )
                );

            // Get the main server's configured boost channel.
            const mainChannelId =
                client.config?.sessionChannelsByGuild?.[MAIN_GUILD_ID]?.boost;

            if (!mainChannelId) {
                throw new Error(
                    "No session-boost channel configured for the main server in config.js."
                );
            }

            const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
            const mainChannel = await mainGuild.channels.fetch(mainChannelId);

            if (!mainChannel?.isTextBased() || !mainChannel.send) {
                throw new Error("The main session-boost channel is invalid.");
            }

            // Main server: role pings followed by the announcement.
            const components = [];

            if (roleIds.length > 0) {
                components.push(
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            roleIds.map(id => `<@&${id}>`).join(" ")
                        )
                    )
                );
            }

            components.push(container);

            await mainChannel.send({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    roles: roleIds,
                },
            });

            // Secondary registered servers: same announcement and image, without role pings.
            await sendToRegisteredServers(
                client,
                container,
                "boost"
            );

            await interaction.editReply({
                content: "Successfully sent a session boost!",
            });

        } catch (error) {
            console.error("Error executing /session-boost:", error);

            await interaction.editReply({
                content: `There was an error sending the session boost: ${error.message}`.slice(
                    0,
                    2000
                ),
            }).catch(() => {});
        }
    },
};