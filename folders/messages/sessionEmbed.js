
const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const SessionsModel = require("../Database/Models/SessionModel.js");
const axios = require("axios");

const STAFF_ROLES = [
    "1546705610417119433",
];

const SESSION_CHANNEL_ID = "1556315219192582295";
const API_BASE_URL = "https://api.erlc.gg/v2";
const REFRESH_INTERVAL = 30_000;

const BANNER_URL = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330566670884894/Session_Shutdown_6.png?backend=b2&ex=6ae75dca&is=6ae60c4a&hm=ce78f974d93ee398c5a82228e25bb877f008554b25d54b2969702949079f5d36&";

const FOOTER_URL = "https://cdn.discordapp.com/attachments/1556327940017623211/1556332002536587465/Copy_of_Untitled_18.png?backend=b2&ex=6ae75f20&is=6ae60da0&hm=0e0ea25bc217929ba1c9fe41f0d4a1196bbc521dcedd0d111d7141997a4dace8&";

const JOIN_URL = "https://erlc.gg/join?code=CCRPNEWVC";

module.exports = {
    name: "embed",
    description: "Send and update the session status panel.",

    run: async (client, message, args) => {
        // Permission check
        const hasPermission = message.member?.roles?.cache?.some(role =>
            STAFF_ROLES.includes(role.id)
        );

        if (!hasPermission) {
            const reply = await message.reply({
                content: "You do not have permission to use this command."
            }).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        // Delete the command message after permission is confirmed.
        await message.delete().catch(() => {});

        const serverKey = client.config?.prcKey;

        if (!serverKey) {
            console.error("[SESSION PANEL] ER:LC API key is missing. Check config.js.");
            return;
        }

        const channel = await client.channels
            .fetch(SESSION_CHANNEL_ID)
            .catch(() => null);

        if (!channel || !channel.isTextBased() || !channel.guild) {
            console.error("[SESSION PANEL] The session panel channel could not be found.");
            return;
        }

        if (client.sessionPanelInterval) {
            clearInterval(client.sessionPanelInterval);
            client.sessionPanelInterval = null;
        }

        if (!client.sessionStatus) {
            client.sessionStatus = "offline";
        }

        const fetchServerData = async () => {
            const response = await axios.get(`${API_BASE_URL}/server`, {
                params: {
                    Players: true,
                    Staff: true,
                    Queue: true
                },
                headers: {
                    "Server-Key": serverKey
                },
                timeout: 15000
            });

            const data = response.data;

            const players = Array.isArray(data?.Players)
                ? data.Players
                : [];

            const queue = Array.isArray(data?.Queue)
                ? data.Queue
                : [];

            const staffPermissions = new Set([
                "moderator",
                "mod",
                "admin",
                "administrator",
                "co-owner",
                "coowner",
                "owner"
            ]);

            const staffCount = players.filter(player => {
                const permission = String(
                    player?.Permission ??
                    player?.permission ??
                    player?.Permissions ??
                    player?.permissions ??
                    ""
                ).trim().toLowerCase();

                return staffPermissions.has(permission);
            }).length;

            return {
                players,
                queue,
                staffCount,
                maxPlayers:
                    data?.MaxPlayers ??
                    data?.["Max Players"] ??
                    data?.maxPlayers ??
                    null
            };
        };

        const buildPanel = (serverData) => {
            const { players, queue, staffCount, maxPlayers } = serverData;
            const online = client.sessionStatus === "online";

            const playerCount = maxPlayers
                ? `${players.length} / ${maxPlayers}`
                : `${players.length}`;

            const nextUpdate = Math.floor(
                (Date.now() + REFRESH_INTERVAL) / 1000
            );

            const container = new ContainerBuilder()
                .setAccentColor(0x37373E);

            // Top banner image
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(BANNER_URL)
                        .setDescription("Chicago City Roleplay banner")
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            // Session information
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "# Session Start Times\n\n" +
                    "> **Weekday Time:** <t:1793217600:t>\n" +
                    "> **Weekend Time:** <t:1793208600:t>\n" +
                    "# Server Information\n\n" +
                    "> **Server Name:** Chicago City Roleplay | VC Only\n" +
                    "> **Server Owner:** Santa201054\n" +
                    "> **Join Code:** CCRPNEWVC\n\n" +
                    "> Do not attempt to join the server when it is shut down.\n" +
                    "> Use the Quick Join button below to try to connect.\n" +
                    "> Click 🔔 to receive the session ping role!"
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            // Live server statistics
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "## Live In-game Server Stats"
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Players**\n\`${playerCount}\``
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Staff Count**\n\`${staffCount}\``
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**In-game Queue**\n\`${queue.length}\``
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Next Update**\n<t:${nextUpdate}:R>\n` +
                    "*In-game stats refresh automatically every 30 seconds.*"
                )
            );

            // Buttons
            const statusButton = new ButtonBuilder()
                .setCustomId("session-status")
                .setLabel(online ? "Server Online" : "Server Offline")
                .setStyle(online ? ButtonStyle.Success : ButtonStyle.Danger)
                .setDisabled(true);

            const notificationButton = new ButtonBuilder()
                .setCustomId("sessionsRole:button")
                .setEmoji("🔔")
                .setStyle(ButtonStyle.Secondary);

            const joinButton = new ButtonBuilder()
                .setLabel("Quick Join")
                .setStyle(ButtonStyle.Link)
                .setURL(JOIN_URL);

            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    statusButton,
                    notificationButton,
                    joinButton
                )
            );

            // Footer image at the very bottom
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(FOOTER_URL)
                        .setDescription("Chicago City Roleplay footer")
                )
            );

            return {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            };
        };

        const refreshPanel = async () => {
            if (!client.sessionPanelMessage) return;

            const serverData = await fetchServerData();

            await client.sessionPanelMessage.edit(
                buildPanel(serverData)
            );
        };

        try {
            const savedSession = await SessionsModel.findOne({
                channelId: SESSION_CHANNEL_ID
            });

            if (savedSession?.messageId) {
                client.sessionPanelMessage = await channel.messages
                    .fetch(savedSession.messageId)
                    .catch(() => null);
            }

            const initialData = await fetchServerData();

            if (client.sessionPanelMessage) {
                await client.sessionPanelMessage.edit(
                    buildPanel(initialData)
                );
            } else {
                client.sessionPanelMessage = await channel.send(
                    buildPanel(initialData)
                );
            }

            client.sessionPanelChannelId = SESSION_CHANNEL_ID;

            await SessionsModel.findOneAndUpdate(
                {
                    channelId: SESSION_CHANNEL_ID
                },
                {
                    channelId: SESSION_CHANNEL_ID,
                    messageId: client.sessionPanelMessage.id
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    setDefaultsOnInsert: true
                }
            );

            client.refreshSessionPanel = async () => {
                try {
                    await refreshPanel();
                } catch (error) {
                    console.error(
                        "[SESSION PANEL] Failed to refresh:",
                        error.response?.data || error.message || error
                    );
                }
            };

            let isRefreshing = false;

            client.sessionPanelInterval = setInterval(async () => {
                if (isRefreshing) return;

                isRefreshing = true;

                try {
                    await refreshPanel();
                } catch (error) {
                    console.error(
                        "[SESSION PANEL] Refresh failed:",
                        error.response?.data || error.message || error
                    );
                } finally {
                    isRefreshing = false;
                }
            }, REFRESH_INTERVAL);

            console.log(
                "[SESSION PANEL] Panel restored or saved; automatic updates started."
            );

        } catch (error) {
            console.error("[SESSION PANEL] Error initializing the session panel:");
            console.dir(error, { depth: null });
        }
    }
};
