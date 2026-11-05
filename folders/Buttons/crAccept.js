const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  FileBuilder,
  MessageFlags,
} = require("discord.js");
const AssistanceModel = require("../Database/Models/AssistanceModel");
const SupportModel = require("../Database/Models/SupportModel");
const discordTranscripts = require("discord-html-transcripts");

const transcriptsChannelId = "1542934345495347260";
  
module.exports = {
  customID: "crAccept:button",
  execute: async function (interaction, client, args) {
    try {
      const ticket =
        (await AssistanceModel.findOne({
          channelId: interaction.channel.id,
        })) ??
        (await SupportModel.findOne({ channelId: interaction.channel.id }));

      if (!ticket) {
        return interaction.reply({
          content: "Ticket not found.",
          ephemeral: true,
        });
      }

      if (interaction.user.id !== ticket.userId) {
        return interaction.reply({
          content: "Only the ticket owner can accept this.",
          ephemeral: true,
        });
      }

      await interaction.update({
        components: [
          new ContainerBuilder().addTextDisplayComponents((x) =>
            x.setContent("Closing ticket and generating transcript..."),
          ),
        ],
        flags: 1 << 15,
      });
      await interaction.followUp("- Closing ticket.");

      const reason = args.length > 0 ? args.join("_") : null;

      const transcriptChannel = await client.channels
        .fetch(transcriptsChannelId)
        .catch(() => null);

      const transcript = await discordTranscripts.createTranscript(
        interaction.channel,
        { poweredBy: false, footerText: `${interaction.guild.name}` },
      );

      const owner = await client.users.fetch(ticket.userId).catch(() => null);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## Ticket Transcript"),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Channel Name:** ${interaction.channel.name}\n**Channel ID:** ${interaction.channel.id}`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Owner:** ${owner ? owner.username : "Unknown"}\n**Mention:** <@${ticket.userId}>\n**User ID:** ${ticket.userId}`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Closed By:** ${interaction.user.username}\n**Mention:** ${interaction.user}\n**Opened On:** <t:${Math.floor(ticket.created / 1000)}:F>\n**Closure Reason:** ${reason ?? "Resolved."}`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addFileComponents(
          new FileBuilder().setURL(
            `attachment://transcript-${interaction.channel.id}.html`,
          ),
        );

      const filePayload = {
        components: [container],
        files: [
          {
            attachment: transcript.attachment,
            name: `transcript-${interaction.channel.id}.html`,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      };

      if (transcriptChannel) await transcriptChannel.send(filePayload);
      if (owner) await owner.send(filePayload).catch(() => {});

      const isOrder = await AssistanceModel.findOne({
        channelId: interaction.channel.id,
      });
      if (isOrder) {
        await AssistanceModel.deleteOne({ channelId: interaction.channel.id });
      } else {
        await SupportModel.deleteOne({ channelId: interaction.channel.id });
      }

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 1000);
    } catch (error) {
      console.error(error);
    }
  },
};

 