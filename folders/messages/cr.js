const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require("discord.js");

const AssistanceModel = require("../Database/Models/AssistanceModel");
const SupportModel = require("../Database/Models/SupportModel");

const STAFF_ROLES = ["1538953559536566314"];

const ALLOWED_CATEGORIES = [
    "1525737455540506705",
    "1525737407142559816",
    "1525737508573282460",
    "1564780742909624350"
];

module.exports = {
    name: "cr",
    description: "Send a close request in the current ticket.",
    roles: STAFF_ROLES,
    allowedCategories: ALLOWED_CATEGORIES,

    run: async function (client, message, args) {
        // Permission check
        const hasPermission = message.member?.roles.cache.some(role =>
            STAFF_ROLES.includes(role.id)
        );

        if (!hasPermission) {
            const reply = await message.reply(
                "You do not have permission to use this command."
            ).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        if (!message.guild) return;

        // Check whether this channel is in an allowed ticket category.
        if (!ALLOWED_CATEGORIES.includes(message.channel.parentId)) {
            const reply = await message.reply(
                "This command cannot be used in this channel."
            );

            setTimeout(() => reply.delete().catch(() => {}), 5000);
            await message.delete().catch(() => {});
            return;
        }

        let ticket;

        try {
            ticket =
                (await AssistanceModel.findOne({
                    channelId: message.channel.id,
                })) ??
                (await SupportModel.findOne({
                    channelId: message.channel.id,
                }));
        } catch (error) {
            console.error("[CR] Failed to look up ticket:", error);

            await message.reply(
                "There was an error checking this ticket."
            ).catch(() => {});

            return;
        }

        if (!ticket) {
            const reply = await message.reply(
                "This channel is not a ticket."
            );

            setTimeout(() => reply.delete().catch(() => {}), 5000);
            await message.delete().catch(() => {});
            return;
        }

        const reason = args.length > 0
            ? args.join(" ").trim()
            : null;

        // Keep the button ID within Discord's 100-character limit.
        // The reason is displayed in the panel, not stored in the ID.
        const acceptId = "crAccept:button";

        await message.delete().catch(() => {});

        const container = new ContainerBuilder()
            .addTextDisplayComponents(t =>
                t.setContent(
                    `## Has your issue been resolved?\n` +
                    `<@${ticket.userId}>, the staff team is requesting to close this ticket.` +
                    `${reason ? `\n\n**Reason:** ${reason}` : ""}\n\n` +
                    `If everything is solved, click **Accept** to close the ticket.\n` +
                    `If you still need help, click **Deny** to keep it open.`
                )
            )
            .addSeparatorComponents(s =>
                s.setDivider(true)
            )
            .addTextDisplayComponents(t =>
                t.setContent(`-# Requested by ${message.author}`)
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(acceptId)
                .setLabel("Accept")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("crDeny:button")
                .setLabel("Deny")
                .setStyle(ButtonStyle.Danger)
        );

        try {
            await message.channel.send({
                components: [container, row],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            console.error("[CR] Failed to send close request:", error);
        }
    },
};
