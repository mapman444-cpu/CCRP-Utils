
const axios = require("axios");

async function getRobloxInfo(userId, interaction, client) {
    const apiKey = process.env.DOCK_API;

    if (!apiKey) {
        console.error("[DOCKSYSTEM] DOCK_API is missing from the environment.");
        return { error: "DockSystem API key is not configured." };
    }

    if (!interaction.guild?.id) {
        return { error: "The Discord server could not be identified." };
    }

    try {
        const response = await axios.get(
            "https://api.docksys.xyz/api/v1/public/discord-to-roblox",
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
                params: {
                    discordId: userId,
                    guildId: interaction.guild.id,
                },
                timeout: 10000,
            }
        );

        const rawRobloxId = response.data?.data?.robloxId;
        const robloxId = String(rawRobloxId ?? "");

        if (!/^\d+$/.test(robloxId)) {
            console.warn(
                `[DOCKSYSTEM] No valid linked Roblox ID for Discord user ${userId}.`
            );

            return { error: "No linked Roblox account was found." };
        }

        const robloxResponse = await axios.get(
            `https://users.roblox.com/v1/users/${robloxId}`,
            { timeout: 10000 }
        );

        const data = robloxResponse.data;

        if (!data?.id || !data?.name) {
            return { error: "Roblox returned incomplete account information." };
        }

        const createdTs = data.created
            ? Math.floor(new Date(data.created).getTime() / 1000)
            : null;

        return {
            robloxId: String(data.id),
            username: data.name,
            createdTs,
        };
    } catch (error) {
        console.error(
            "[DOCKSYSTEM] Roblox lookup failed:",
            error.response?.status || error.code || error.message,
            error.response?.data || ""
        );

        return {
            error: "Failed to retrieve linked Roblox account information.",
        };
    }
}

module.exports = { getRobloxInfo };
