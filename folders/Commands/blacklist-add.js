const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder,
} = require("discord.js");

const blacklist = require("../Utils/blacklistStorage");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blacklist-add")
        .setDescription("Blacklist a user across all registered servers.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Select the user to blacklist.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Why are they being blacklisted?")
                .setRequired(true)
                .setMaxLength(500)
        ),

    async execute(interaction, client) {
        const errorEmbed = description =>
            new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("Blacklist Error")
                .setDescription(description)
                .setTimestamp();

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                embeds: [errorEmbed("You don't have permission to use this command.")],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const userId = user.id;

        if (user.bot) {
            return interaction.editReply({
                embeds: [errorEmbed("You can't blacklist a bot account.")],
            });
        }

        const guildIds = [
            ...new Set(client.config?.registeredGuildIds || []),
        ];

        if (!guildIds.length) {
            return interaction.editReply({
                embeds: [errorEmbed("There are no registered servers in config.js.")],
            });
        }

        try {
            await blacklist.addUser(userId, reason, interaction.user.id);
        } catch (error) {
            console.error("[Blacklist] MongoDB error:", error);

            return interaction.editReply({
                embeds: [errorEmbed("I couldn't save this user to the blacklist. Check the MongoDB connection.")],
            });
        }

        const results = [];

        for (const guildId of guildIds) {
            try {
                const guild = await client.guilds.fetch(guildId);

                const existingBan = await guild.bans
                    .fetch(userId)
                    .catch(() => null);

                if (existingBan) {
                    results.push(`Already banned in **${guild.name}**`);
                    continue;
                }

                await guild.bans.create(userId, {
                    reason: `Blacklisted by ${interaction.user.tag}: ${reason}`,
                });

                results.push(`Banned from **${guild.name}**`);
            } catch (error) {
                console.error(`[Blacklist] Could not ban ${userId} in ${guildId}:`, error);
                results.push(`Couldn't ban in server ${guildId}`);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("Chicago City Roleplay Blacklist")
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: "User", value: `${user.tag} (${user.id})` },
                { name: "Reason", value: reason },
                { name: "Server Results", value: results.join("\n").slice(0, 1024) || "No results available." }
            )
            .setFooter({ text: `Added by ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};
