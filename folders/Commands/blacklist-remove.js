const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder,
} = require("discord.js");

const blacklist = require("../Utils/blacklistStorage");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blacklist-remove")
        .setDescription("Remove a user from the global blacklist.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option
                .setName("user_id")
                .setDescription("The user's Discord ID.")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const errorEmbed = (description) =>
            new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("Blacklist Error")
                .setDescription(description)
                .setTimestamp();

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                embeds: [
                    errorEmbed("You don't have permission to use this command."),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        const userId = interaction.options.getString("user_id").trim();

        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.editReply({
                embeds: [errorEmbed("That isn't a valid Discord user ID.")],
            });
        }

        const guildIds = [
            ...new Set(client.config?.registeredGuildIds || []),
        ];

        if (!guildIds.length) {
            return interaction.editReply({
                embeds: [
                    errorEmbed("There are no registered servers in config.js."),
                ],
            });
        }

        try {
            const results = [];
            let failed = false;

            for (const guildId of guildIds) {
                try {
                    const guild = await client.guilds.fetch(guildId);

                    const existingBan = await guild.bans
                        .fetch(userId)
                        .catch(error => {
                            if (error.code === 10026) return null;
                            throw error;
                        });

                    if (!existingBan) {
                        results.push(`They weren't banned in **${guild.name}**`);
                        continue;
                    }

                    await guild.bans.remove(
                        userId,
                        `Blacklist removed by ${interaction.user.tag}`
                    );

                    results.push(`Unbanned from **${guild.name}**`);
                } catch (error) {
                    failed = true;

                    console.error(
                        `[Blacklist] Could not unban ${userId} in ${guildId}:`,
                        error
                    );

                    results.push(`Couldn't unban in server ${guildId}`);
                }
            }

            if (failed) {
                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle("Blacklist Removal Incomplete")
                    .setDescription(
                        "Some servers couldn't be unbanned. The blacklist entry was kept so you can try again."
                    )
                    .addFields(
                        { name: "User ID", value: userId },
                        {
                            name: "Server Results",
                            value: results.join("\n").slice(0, 1024),
                        }
                    )
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed],
                });
            }

            const existed = await blacklist.removeUser(userId);

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle("Blacklist Removal Complete")
                .setDescription(
                    existed
                        ? "The user has been removed from the global blacklist."
                        : "No blacklist entry was found, but all server unban checks were completed."
                )
                .addFields(
                    { name: "User ID", value: userId },
                    {
                        name: "Server Results",
                        value: results.join("\n").slice(0, 1024),
                    }
                )
                .setFooter({
                    text: `Removed by ${interaction.user.tag}`,
                })
                .setTimestamp();

            return interaction.editReply({
                embeds: [embed],
            });

        } catch (error) {
            console.error("[Blacklist] Error removing user:", error);

            return interaction.editReply({
                embeds: [
                    errorEmbed(
                        "Something went wrong while removing this user. Check the console."
                    ),
                ],
            });
        }
    },
};
