
const {
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require("discord.js");

const mongoose = require("mongoose");

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [
        days > 0 ? `${days}d` : null,
        hours > 0 ? `${hours}h` : null,
        minutes > 0 ? `${minutes}m` : null,
        `${secs}s`,
    ].filter(Boolean).join(" ");
}

function formatMemory(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

module.exports = {
    name: "ping",
    description: "Check bot ping and status",

    run: async function (client, message, args) {
        const sent = await message.reply("Pinging...");

        const botPing = sent.createdTimestamp - message.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);

        const mongoConnected = mongoose.connection.readyState === 1;
        const mongoStatus = mongoConnected ? "Connected" : "Disconnected";

        const uptime = formatUptime(process.uptime());

        const memory = process.memoryUsage();

        const serverCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce(
            (total, guild) => total + guild.memberCount,
            0
        );

        const container = new ContainerBuilder()
            .setAccentColor(mongoConnected ? 0x57F287 : 0xED4245)
            .addTextDisplayComponents(t =>
                t.setContent("## 🏓 Pong!")
            )
            .addSeparatorComponents(s =>
                s.setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(t =>
                t.setContent(
                    `### Connection\n` +
                    `**Bot Latency:** ${botPing}ms\n` +
                    `**API Latency:** ${apiPing}ms\n` +
                    `**MongoDB:** ${mongoStatus}`
                )
            )
            .addSeparatorComponents(s =>
                s.setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(t =>
                t.setContent(
                    `### Bot Statistics\n` +
                    `**Uptime:** ${uptime}\n` 
                )
            )
            .addSeparatorComponents(s =>
                s.setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(t =>
                t.setContent(
                    `### System\n` +
                    `**Memory Usage:** ${formatMemory(memory.rss)}\n` +
                    `**Node.js:** ${process.version}\n` +
                    `**Discord.js:** ${require("discord.js").version}`
                )
            );

        await sent.edit({
            content: "",
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
