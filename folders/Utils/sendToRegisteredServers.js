
const { MessageFlags } = require("discord.js");

const MAIN_GUILD_ID = "1520517822046802120";

async function sendToRegisteredServers(client, container, announcementType) {
    const registeredGuildIds = client.config?.registeredGuildIds || [];
    const channelsByGuild = client.config?.sessionChannelsByGuild || {};

    let sentCount = 0;

    for (const guildId of registeredGuildIds) {
        // Main server is handled separately by each command.
        if (guildId === MAIN_GUILD_ID) continue;

        const channelId = channelsByGuild[guildId]?.[announcementType];

        if (!channelId || channelId.includes("_CHANNEL_ID")) {
            console.warn(
                `[Session Broadcast] No valid ${announcementType} channel configured for guild ${guildId}.`
            );
            continue;
        }

        try {
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);

            if (!channel?.isTextBased() || !channel.send) {
                console.warn(
                    `[Session Broadcast] Invalid channel ${channelId} in guild ${guildId}.`
                );
                continue;
            }

            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                },
            });

            sentCount++;

            console.log(
                `[Session Broadcast] Sent ${announcementType} announcement to ${guild.name}.`
            );
        } catch (error) {
            console.error(
                `[Session Broadcast] Failed for guild ${guildId}:`,
                error
            );
        }
    }

    return sentCount;
}

module.exports = sendToRegisteredServers;
