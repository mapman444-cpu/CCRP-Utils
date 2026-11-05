
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "ping",
    description: "Check the bot's response time.",

    run: async function (client, message, args) {
        const sent = await message.reply("Checking ping...");

        const botLatency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor("#2B2D31")
            .setTitle("Pong!")
            .addFields(
                {
                    name: "Bot Latency",
                    value: `${botLatency}ms`,
                    inline: true
                },
                {
                    name: "API Latency",
                    value: `${apiLatency}ms`,
                    inline: true
                }
            )
            .setFooter({
                text: "Chicago City Roleplay Utilities"
            })
            .setTimestamp();

        await sent.edit({
            content: "",
            embeds: [embed]
        });
    },
};
