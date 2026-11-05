const { PermissionFlagsBits } = require("discord.js");
const SupportModel = require("../Database/Models/SupportModel");

module.exports = {
    name: "add",
    description: "Add a member or role to the current ticket.",
    roles: ["1538953559536566314"],
    cooldown: 3,

    run: async function (client, message, args) {
        const sendTemporary = async (content) => {
            const reply = await message.channel.send(content).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }
        };

        if (!message.guild || !message.member) {
            return;
        }

        // Check staff permissions.
        const hasPermission = message.member.roles.cache.some(role =>
            this.roles.includes(role.id)
        );

        if (!hasPermission) {
            await message.delete().catch(() => {});
            return sendTemporary(
                "You do not have permission to use this command."
            );
        }

        // Only allow this command in a registered support ticket.
        const ticket = await SupportModel.findOne({
            channelId: message.channel.id,
        }).catch(error => {
            console.error("[ADD] Failed to check ticket:", error);
            return null;
        });

        if (!ticket) {
            await message.delete().catch(() => {});
            return sendTemporary(
                "This command can only be used inside a support ticket."
            );
        }

        const roles = [...message.mentions.roles.values()];
        const members = [...message.mentions.members.values()];

        if (roles.length === 0 && members.length === 0) {
            await message.delete().catch(() => {});
            return sendTemporary(
                "Usage: `-add @member` or `-add @role`\n" +
                "You can mention multiple members and roles."
            );
        }

        const botMember = message.guild.members.me;

        if (
            !botMember ||
            !botMember.permissions.has(PermissionFlagsBits.ManageChannels)
        ) {
            await message.delete().catch(() => {});
            return sendTemporary(
                "I need the Manage Channels permission to update ticket access."
            );
        }

        const added = [];
        const failed = [];

        // Give mentioned roles access to this ticket channel.
        for (const role of roles) {
            try {
                if (
                    role.id === message.guild.id ||
                    role.managed ||
                    role.position >= botMember.roles.highest.position
                ) {
                    failed.push(role.name);
                    continue;
                }

                await message.channel.permissionOverwrites.edit(role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                });

                added.push(`@${role.name}`);
            } catch (error) {
                console.error(
                    `[ADD] Failed to grant access to role ${role.id}:`,
                    error.message
                );
                failed.push(role.name);
            }
        }

        // Give mentioned members access to this ticket channel.
        for (const member of members) {
            try {
                if (member.user.bot && member.id !== client.user.id) {
                    failed.push(member.user.username);
                    continue;
                }

                await message.channel.permissionOverwrites.edit(member.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                });

                added.push(`<@${member.id}>`);
            } catch (error) {
                console.error(
                    `[ADD] Failed to grant access to member ${member.id}:`,
                    error.message
                );
                failed.push(member.user.username);
            }
        }

        await message.delete().catch(() => {});

        let content = "";

        if (added.length > 0) {
            content += `Granted ticket access to ${added.join(", ")}.`;
        }

        if (failed.length > 0) {
            content += `${content ? "\n" : ""}Could not add: ${failed.join(", ")}.`;
        }

        await sendTemporary(content || "No ticket permissions were changed.");
    },
};
