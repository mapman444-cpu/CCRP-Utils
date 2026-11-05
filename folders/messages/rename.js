module.exports = {
    name: "rename",
    description: "Renames the current ticket channel.",

    users: ["1072934656015618058"],
    roles: ["1538953559536566314"],

    run: async function (client, message, args) {
        const allowedUsers = this.users || [];
        const allowedRoles = this.roles || [];

        const hasUserPermission = allowedUsers.includes(message.author.id);

        const hasRolePermission = message.member?.roles.cache.some(role =>
            allowedRoles.includes(role.id)
        );

        if (!hasUserPermission && !hasRolePermission) {
            const reply = await message.reply(
                "You do not have permission to use this command."
            ).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        const name = args
            .join(" ")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        if (!name) {
            const reply = await message.reply(
                "Usage: `-rename <name>`"
            ).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        if (name.length > 100) {
            const reply = await message.reply(
                "Channel names cannot exceed 100 characters."
            ).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        const channel = message.channel;
        const oldName = channel.name;

        try {
            await channel.setName(name, `Renamed by ${message.author.tag}`);
            await message.delete().catch(() => {});

            const confirm = await channel.send(
                `Channel renamed from **${oldName}** to **${name}**.`
            );

            setTimeout(() => confirm.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error("[RENAME] Failed to rename channel:", error);

            const reply = await channel.send(
                "I couldn't rename this channel. Check that I have the **Manage Channels** permission."
            ).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }
        }
    },
};
