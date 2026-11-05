
const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require("discord.js");

const { getRobloxInfo } = require("../Utils/docksystem");
const SupportModel = require("../Database/Models/SupportModel");

const TICKET_ROLES = {
    General: [
        "1546705610417119433",
        "1520969944483889333",
        "1554980684471468132",
        "1520983649363951716",
        "1520971125243515052",
    ],
    Internal: [
        "1520983649363951716",
        "1546705610417119433",
        "1520971125243515052",
        "1554980684471468132",
        "1520969944483889333",
    ],
    Management: [
        "1520971125243515052",
        "1546705610417119433",
        "1554980684471468132",
        "1520969944483889333",
    ],
    Partnership: [
        "1546705610417119433",
        "1520969944483889333",
        "1554980684471468132",
    ],
};

const CATEGORIES = {
    General: "1525737455540506705",
    Internal: "1525737407142559816",
    Management: "1525737508573282460",
    Partnership: "1564780742909624350",
};

const TYPE_LABELS = {
    General: "General Support",
    Internal: "Internal Affairs Support",
    Management: "Management Support",
    Partnership: "Partnership Support",
};

const BANNER_URL =
    "https://media.discordapp.net/attachments/1556327940017623211/1556329340881604658/Assistance_7.png?format=webp&quality=lossless";

function normalizeType(value) {
    if (!value) return null;

    const match = Object.keys(TYPE_LABELS).find(
        (type) => type.toLowerCase() === String(value).toLowerCase()
    );

    return match || null;
}

module.exports = {
    customID: "support:ticketreason",

    async execute(interaction, client, args = []) {
        let channel;

        try {
            const type = normalizeType(args[0]);

            if (!type) {
                return interaction.reply({
                    content: "This ticket category is invalid. Please reopen the ticket form.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (!interaction.inGuild() || !interaction.guild) {
                return interaction.reply({
                    content: "Tickets can only be created inside the server.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const { guild, user } = interaction;
            const label = TYPE_LABELS[type];
            const categoryId = CATEGORIES[type];
            const reason = interaction.fields
                .getTextInputValue("reason")
                .trim();

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral,
            });

            const existing = await SupportModel.findOne({
                userId: user.id,
                type,
            });

            if (existing) {
                const existingChannel = await guild.channels
                    .fetch(existing.channelId)
                    .catch(() => null);

                if (existingChannel) {
                    return interaction.editReply({
                        content: `You already have an open ${label} ticket: ${existingChannel}`,
                    });
                }

                // Remove an outdated database record if its channel was deleted.
                await SupportModel.deleteOne({
                    channelId: existing.channelId,
                });
            }

            const permissionOverwrites = [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                    ],
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.AttachFiles,
                    ],
                },
            ];

            for (const roleId of TICKET_ROLES[type]) {
                const role = await guild.roles.fetch(roleId).catch(() => null);

                if (role) {
                    permissionOverwrites.push({
                        id: role.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks,
                        ],
                    });
                } else {
                    console.warn(
                        `[SUPPORT] Could not find configured role ${roleId} for ${type}.`
                    );
                }
            }

            const safeUsername = user.username
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 80) || "user";

            channel = await guild.channels.create({
                name: `${type.toLowerCase()}-${safeUsername}`.slice(0, 100),
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites,
                reason: `${label} opened by ${user.tag}`,
            });

            await SupportModel.create({
                userId: user.id,
                channelId: channel.id,
                type,
                created: Date.now(),
            });

            // Fetch Roblox information through your existing Dock system utility.
            let robloxInfo = null;

            try {
                const result = await getRobloxInfo(user.id, interaction, client);

                if (result && !result.error) {
                    robloxInfo = result;
                } else {
                    console.warn(
                        `[SUPPORT] Roblox information unavailable for Discord user ${user.id}:`,
                        result?.error || "No Roblox information returned."
                    );
                }
            } catch (error) {
                console.error(
                    `[SUPPORT] Roblox lookup failed for ${user.id}:`,
                    error
                );
            }

            const ticketContainer = new ContainerBuilder()
                .addTextDisplayComponents((text) =>
                    text.setContent(`@here | <@${user.id}>`)
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(BANNER_URL)
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(false)
                )
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        `## ${label} - ${user.username}\n` +
                        `**Reason:** ${reason}\n\n` +
                        "Please wait for a staff member to assist you."
                    )
                );

            if (robloxInfo?.username && robloxInfo?.robloxId) {
                const robloxId = String(robloxInfo.robloxId);
                const profileLink =
                    `https://www.roblox.com/users/${encodeURIComponent(robloxId)}/profile`;

                let creationDate = "Unavailable";

                if (robloxInfo.createdTs != null) {
                    let timestamp = Number(robloxInfo.createdTs);

                    // Discord timestamps use seconds, not milliseconds.
                    if (timestamp > 1e12) {
                        timestamp = Math.floor(timestamp / 1000);
                    }

                    if (Number.isFinite(timestamp) && timestamp > 0) {
                        creationDate = `<t:${Math.floor(timestamp)}:D>`;
                    }
                }

                ticketContainer
                    .addSeparatorComponents(
                        new SeparatorBuilder().setDivider(false)
                    )
                    .addTextDisplayComponents((text) =>
                        text.setContent(
                            `## Roblox Information\n` +
                            `**Roblox Profile:** [${robloxInfo.username}](${profileLink})\n` +
                            `**User ID:** ${robloxId}\n` +
                            `**Account Created:** ${creationDate}`
                        )
                    );
            } else {
                ticketContainer
                    .addSeparatorComponents(
                        new SeparatorBuilder().setDivider(false)
                    )
                    .addTextDisplayComponents((text) =>
                        text.setContent(
                            "## Roblox Information\n" +
                            "Roblox account information could not be retrieved."
                        )
                    );
            }

            ticketContainer
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(false)
                )
                .addTextDisplayComponents((text) =>
                    text.setContent("-# Use the button below to close this ticket.")
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("closeSupport:button")
                            .setLabel("Close Ticket")
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

            await channel.send({
                components: [ticketContainer],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    users: [user.id],
                    parse: ["everyone"],
                },
            });

            await interaction.editReply({
                content: `Your ${label} ticket has been created: ${channel}`,
            });

            console.log(
                `[SUPPORT] Created ${type} ticket ${channel.id} for ${user.tag}`
            );
        } catch (error) {
            console.error("[SUPPORT] Ticket creation failed:", error);

            if (channel) {
                await SupportModel.deleteOne({
                    channelId: channel.id,
                }).catch(() => {});

                await channel.delete("Ticket setup failed").catch(() => {});
            }

            const response = {
                content:
                    "I couldn't finish creating your ticket. Please contact staff if the problem continues.",
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(response).catch(() => {});
            } else {
                await interaction.reply({
                    ...response,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
        }
    },
};
