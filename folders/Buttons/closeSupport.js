const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    FileBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");

const SupportModel = require("../Database/Models/SupportModel.js");
const discordTranscripts = require("discord-html-transcripts");

const transcriptsChannelId = "1542934345495347260";

module.exports = {
    customID: "closeSupport:button",

    execute: async function (interaction, client) {
        try {
            const ticket = await SupportModel.findOne({
                channelId: interaction.channel.id,
            });

            if (!ticket) {
                return interaction.reply({
                    content: "Ticket not found.",
                    ephemeral: true,
                });
            }

            const modal = new ModalBuilder()
                .setCustomId("closeSupport:reason")
                .setTitle("Close Support Ticket");

            const reasonInput = new TextInputBuilder()
                .setCustomId("reason")
                .setLabel("Reason for closing")
                .setPlaceholder("Enter the reason for closing this ticket.")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(reasonInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error("Error opening ticket closure modal:", error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Unable to start the ticket closure process.",
                    ephemeral: true,
                }).catch(() => {});
            }
        }
    },
};

module.exports.closeTicket = async function (interaction, client, reason) {
    let replied = false;

    try {
        await interaction.reply({
            content: "Closing ticket and generating transcript...",
            ephemeral: true,
        });
        replied = true;

        const ticketChannel = interaction.channel;

        const ticket = await SupportModel.findOne({
            channelId: ticketChannel.id,
        });

        if (!ticket) {
            return interaction.editReply("Ticket not found.");
        }

        const transcript = await discordTranscripts.createTranscript(
            ticketChannel,
            {
                poweredBy: false,
                footerText: interaction.guild.name,
            }
        );

        const owner = await client.users
            .fetch(ticket.userId)
            .catch(() => null);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Ticket Transcript")
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Channel Name:** ${ticketChannel.name}\n` +
                    `**Channel ID:** ${ticketChannel.id}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Owner:** ${owner ? owner.username : "Unknown"}\n` +
                    `**Mention:** <@${ticket.userId}>\n` +
                    `**User ID:** ${ticket.userId}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Closed By:** ${interaction.user.username}\n` +
                    `**Mention:** <@${interaction.user.id}>\n` +
                    `**Opened On:** <t:${Math.floor(ticket.created / 1000)}:F>\n` +
                    `**Closure Reason:** ${reason}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true)
            )
            .addFileComponents(
                new FileBuilder().setURL(
                    `attachment://transcript-${ticketChannel.id}.html`
                )
            );

        const filePayload = {
            components: [container],
            files: [
                {
                    attachment: transcript.attachment,
                    name: `transcript-${ticketChannel.id}.html`,
                },
            ],
            flags: MessageFlags.IsComponentsV2,
        };

        const transcriptChannel = await client.channels
            .fetch(transcriptsChannelId)
            .catch(() => null);

        if (transcriptChannel && transcriptChannel.isTextBased()) {
            await transcriptChannel.send(filePayload);
        } else {
            console.error("Transcript channel was not found or is not text-based.");
        }

        if (owner) {
            await owner.send(filePayload).catch((error) => {
                console.error("Could not DM the ticket owner:", error.message);
            });
        }

        await SupportModel.deleteOne({
            channelId: ticketChannel.id,
        });

        await interaction.editReply("Ticket closed successfully.");

        setTimeout(async () => {
            await ticketChannel.delete("Support ticket closed").catch(() => {});
        }, 1000);
    } catch (error) {
        console.error("Error closing support ticket:", error);

        if (replied) {
            await interaction.editReply(
                "An error occurred while closing the ticket."
            ).catch(() => {});
        } else if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "An error occurred while closing the ticket.",
                ephemeral: true,
            }).catch(() => {});
        }
    }
};