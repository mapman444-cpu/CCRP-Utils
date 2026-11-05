
const {
    MessageFlags,
} = require("discord.js");

const {
    isStaff,
    storage,
    updateReviewMessage,
    buildDecisionContainer,
    CONFIG,
} = require("../Utils/roleRequests/helpers");

module.exports = {
    customID: "rr_deny_reason",

    async execute(interaction, client, args) {
        const requestId = args?.[0];

        const request = storage.getRequest(requestId);

        if (!request) {
            return interaction.reply({
                content: "This request could not be found. Please submit a new request.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: "You are not authorized to review role requests.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (request.status !== "pending") {
            return interaction.reply({
                content: "This request has already been handled.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const reason = interaction.fields
            .getTextInputValue("reason")
            .trim();

        if (!reason) {
            return interaction.reply({
                content: "You must provide a denial reason.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!storage.claimDecision(
            requestId,
            interaction.user.id,
            "denied"
        )) {
            return interaction.reply({
                content: "This request has already been handled.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const decisionText =
            `**Denied** by <@${interaction.user.id}>.\n` +
            `**Reason:** ${reason}`;

        await updateReviewMessage(request, decisionText);

        let dmSent = false;

        try {
            const applicant = await client.users.fetch(request.userId);

            const dmContainer = buildDecisionContainer({
                headerImage: CONFIG.DENIED_HEADER_IMAGE,
                userId: request.userId,
                reviewerId: interaction.user.id,
                message:
                    `Your role request has been denied for the following reason: ${reason}\n\n` +
                    `You have not been given the requested roles. If you have any questions, please reach out to ${interaction.user.tag}.`,
            });

            await applicant.send({
                components: [dmContainer],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                },
            });

            dmSent = true;

        } catch (error) {
            console.warn(
                "[ROLE REQUEST] Could not DM applicant:",
                error.message
            );
        }

        return interaction.reply({
            content: dmSent
                ? "The role request has been denied. The applicant was notified."
                : "The role request has been denied, but I could not DM the applicant.",
            flags: MessageFlags.Ephemeral,
        });
    },
};
