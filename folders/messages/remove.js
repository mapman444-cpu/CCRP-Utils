const { PermissionFlagsBits } = require("discord.js");
const SupportModel = require("../Database/Models/SupportModel");

module.exports = {
    name: "remove",
    description: "Remove a member or role from the current ticket.",
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
            console.error("[REMOVE] Failed to check ticket:", error);
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
                "Usage: `-remove @member` or `-remove @role`\n" +
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

        const removed = [];
        const failed = [];

        // Remove the explicitly configured channel permission for each role.
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

                const overwrite =
                    message.channel.permissionOverwrites.cache.get(role.id);

                if (!overwrite) {
                    failed.push(`${role.name} (no specific ticket permission)`);
                    continue;
                }

                await message.channel.permissionOverwrites.delete(
                    role.id,
                    `Ticket access removed by ${message.author.tag}`
                );

                removed.push(`@${role.name}`);
            } catch (error) {
                console.error(
                    `[REMOVE] Failed to remove access for role ${role.id}:`,
                    error.message
                );
                failed.push(role.name);
            }
        }

        // Remove the explicitly configured channel permission for each member.
        for (const member of members) {
            try {
                if (member.id === client.user.id) {
                    failed.push(`${member.user.username} (bot access protected)`);
                    continue;
                }

                const overwrite =
                    message.channel.permissionOverwrites.cache.get(member.id);

                if (!overwrite) {
                    failed.push(`${member.user.username} (no specific ticket permission)`);
                    continue;
                }

                await message.channel.permissionOverwrites.delete(
                    member.id,
                    `Ticket access removed by ${message.author.tag}`
                );

                removed.push(member.user.username);
            } catch (error) {
                console.error(
                    `[REMOVE] Failed to remove access for member ${member.id}:`,
                    error.message
                );
                failed.push(member.user.username);
            }
        }

        await message.delete().catch(() => {});

        let content = "";

        if (removed.length > 0) {
            content += `Removed ticket access for: ${removed.join(", ")}.`;
        }

        if (failed.length > 0) {
            content += `${content ? "\n" : ""}Could not remove access for: ${failed.join(", ")}.`;
        }

        await sendTemporary(content || "No ticket permissions were changed.");
    },
};
