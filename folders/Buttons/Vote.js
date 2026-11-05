const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require("discord.js");

const cooldowns = new Map();

const COOLDOWN_TIME = 3000;
const REQUIRED_VOTES = 10;
const MAIN_GUILD_ID = "1520517822046802120";

const HEADER_IMAGE = "https://cdn.discordapp.com/attachments/1556327940017623211/1556330391206494340/Session_Start_4.png?backend=b2&ex=6ae36920&is=6ae217a0&hm=3a81280d3b62514ee9e82217c1af27d72db9703c99f4986542bb6f6e1d345663&"; // Your banner image URL
const CHANNEL_ID = "1556315219192582295"; // Main server's session startup channel ID

const ROLE_IDS = [
  "1538950575192809492", // Main-server notification role ID
  "1520984853104037898", // Main-server notification role ID
].filter(Boolean);

function addHeader(container) {
  if (!HEADER_IMAGE) return container;

  return container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(HEADER_IMAGE)
    )
  );
}

function buildVotePanel(sessionId, count, hasVoted) {
  const container = addHeader(
    new ContainerBuilder().setAccentColor(0x37373E)
  );

  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# Chicago City Roleplay Session Vote",
          "> A session vote has been initiated! Click the **Vote** button to show our staff that you are interested in joining the session!",
          "> Make sure to read over our rules before joining.",
          "> Required vote count: **10**",
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote:button_${sessionId}`)
          .setLabel(`${count}/${REQUIRED_VOTES}`)
          .setStyle(
            hasVoted ? ButtonStyle.Success : ButtonStyle.Secondary
          ),
        new ButtonBuilder()
          .setCustomId(`viewvote:button_${sessionId}`)
          .setLabel(`View Voters (${count})`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return container;
}

module.exports = {
  customID: "vote:button",

  async execute(interaction, client, args) {
    // Only allow voting in the main server.
    if (interaction.guildId !== MAIN_GUILD_ID) {
      return interaction.reply({
        content: "Voting is only available in the main chigaco roleplay server.",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const sessionId =
      args?.[0] ||
      interaction.customId?.split("_").slice(1).join("_");

    if (!sessionId) {
      return interaction.reply({
        content: "Unable to identify this session vote.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const userId = interaction.user.id;
    const now = Date.now();
    const expiresAt = cooldowns.get(userId);

    if (expiresAt && now < expiresAt) {
      return interaction.reply({
        content:
          `You are on cooldown. Please try again <t:${Math.floor(expiresAt / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    cooldowns.set(userId, now + COOLDOWN_TIME);

    setTimeout(() => {
      if (cooldowns.get(userId) === now + COOLDOWN_TIME) {
        cooldowns.delete(userId);
      }
    }, COOLDOWN_TIME);

    if (!client.voteMap) {
      client.voteMap = new Map();
    }

    if (!client.voteMap.has(sessionId)) {
      client.voteMap.set(sessionId, new Map());
    }

    const sessionVotes = client.voteMap.get(sessionId);
    const hasVoted = sessionVotes.has(userId);

    if (hasVoted) {
      sessionVotes.delete(userId);
    } else {
      sessionVotes.set(userId, {
        userId,
        timestamp: Date.now(),
      });
    }

    const count = sessionVotes.size;

    try {
      const updatedComponents =
        interaction.message.components.length > 1
          ? [
              interaction.message.components[0],
              buildVotePanel(sessionId, count, !hasVoted),
            ]
          : [buildVotePanel(sessionId, count, !hasVoted)];

      await interaction.update({
        components: updatedComponents,
        flags: MessageFlags.IsComponentsV2,
      });

      await interaction.followUp({
        content: hasVoted
          ? "Successfully removed your vote."
          : "Successfully counted your vote.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error updating the vote panel:", error);
      return;
    }

    if (count < REQUIRED_VOTES) return;

    if (!client.completedPolls) {
      client.completedPolls = new Set();
    }

    if (client.completedPolls.has(sessionId)) return;

    // Prevent multiple startup announcements for the same poll.
    client.completedPolls.add(sessionId);

    const votersList = [...sessionVotes.values()]
      .map(voter => `<@${voter.userId}>`)
      .join(", ") || "**No voters!**";

    const serverName = "Chicago City Roleplay";
    const serverOwner = "Santa201054";
    const joinCode = "CCRPNEWVC";

    const startupContainer = addHeader(
      new ContainerBuilder().setAccentColor(0x37373E)
    );

    startupContainer
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "# Chicago City Roleplay Session Startup",
            "> A server start-up has been initiated! Please ensure you have read and understood our regulations before joining.",
            "",
            "## Game Information",
            `> **Server Name:** ${serverName}`,
            `> **Server Owner:** ${serverOwner}`,
            `> **Join Code:** ${joinCode}`,
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## Session Voters\n${votersList}`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Quick Join")
            .setURL("https://erlc.gg/CCRPNEWVC")
            .setStyle(ButtonStyle.Link)
        )
      );

    try {
      const channel = await client.channels.fetch(CHANNEL_ID);

      if (!channel?.isTextBased() || !channel.send) {
        throw new Error(
          "The session startup channel could not be found. Check CHANNEL_ID."
        );
      }

      const voterIds = [...sessionVotes.values()]
        .map(voter => voter.userId);

      const components = [];

      if (ROLE_IDS.length > 0) {
        components.push(
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              ROLE_IDS.map(id => `<@&${id}>`).join(" ")
            )
          )
        );
      }

      components.push(startupContainer);

      await channel.send({
        components,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
          roles: ROLE_IDS,
          users: voterIds,
        },
      });

      // Broadcast the same startup container to registered servers.
      // This assumes your helper is located in the Utils folder.
      const sendToRegisteredServers =
        require("../Utils/sendToRegisteredServers");

      await sendToRegisteredServers(client, startupContainer);

      client.sessionStatus = "online";

      if (typeof client.refreshSessionPanel === "function") {
        await client.refreshSessionPanel();
      }

      client.voteMap.delete(sessionId);

      if (client.activePollId === sessionId) {
        client.activePollId = null;
      }
    } catch (error) {
      console.error(
        "Failed to send the session startup announcement:",
        error
      );

      client.completedPolls.delete(sessionId);
    }
  },
};
