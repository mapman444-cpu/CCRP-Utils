
const {
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require("discord.js");

const mongoose = require("mongoose");
const { version } = require("discord.js");

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
        const mongoStatus = mongoConnected
            ? "Connected"
            : "Disconnected";

        // Discord automatically updates this timestamp.
        const startedAt = Math.floor(
            (Date.now() - process.uptime() * 1000) / 1000
        );

        const memory = process.memoryUsage();

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
                    `**MongoDB:** ${mongoStatus}\n` +
                    `**Uptime:** <t:${startedAt}:R>`
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
                    `**Discord.js:** ${version}`
                )
            );

        await sent.edit({
            content: "",
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
