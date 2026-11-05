
const {
    MessageFlags,
} = require("discord.js");

const {
    isStaff,
    isAssignableRole,
    buildDecisionContainer,
    updateReviewMessage,
    storage,
    CONFIG,
} = require("../Utils/roleRequests/helpers");

module.exports = {
    customID: "rr_approve_roles",

    async execute(interaction) {
        const requestId = interaction.customId.replace("rr_approve_roles_", "");
        const request = storage.getRequest(requestId);

        if (!request) {
            return interaction.reply({
                content: "This request has expired or has already been handled.",
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
                content: "This request is already being processed.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const selectedRoleIds = interaction.values || [];

        const validRoleIds = selectedRoleIds.filter(roleId => {
            const role = request.guild.roles.cache.get(roleId);

            return (
                request.roleIds.includes(roleId) &&
                role &&
                isAssignableRole(role, request.guild)
            );
        });

        if (!validRoleIds.length) {
            return interaction.reply({
                content: "No valid requested roles were selected.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!storage.claimDecision(requestId, interaction.user.id, "approving")) {
            return interaction.reply({
                content: "Another reviewer has already started handling this request.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferUpdate();

        const member = await request.guild.members
            .fetch(request.userId)
            .catch(() => null);

        if (!member) {
            storage.updateRequest(requestId, {
                status: "pending",
                reviewerId: null,
            });

            return interaction.followUp({
                content: "The applicant is no longer in the server. No roles were assigned.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const rolesToAdd = validRoleIds.filter(roleId => {
            const role = request.guild.roles.cache.get(roleId);
            return role && isAssignableRole(role, request.guild);
        });

        if (!rolesToAdd.length) {
            storage.updateRequest(requestId, {
                status: "pending",
                reviewerId: null,
            });

            return interaction.followUp({
                content: "The selected roles can no longer be assigned.",
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            await member.roles.add(
                rolesToAdd,
                `Role request approved by ${interaction.user.tag}`
            );
        } catch (error) {
            console.error("[ROLE REQUEST] Failed to assign roles:", error);

            storage.updateRequest(requestId, {
                status: "pending",
                reviewerId: null,
            });

            return interaction.followUp({
                content: "I could not assign the roles. Check my Manage Roles permission and role hierarchy.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const givenNames = rolesToAdd.map(roleId =>
            request.guild.roles.cache.get(roleId)?.name || "Unknown role"
        );

        const decisionText =
            `**Accepted** by <@${interaction.user.id}>.\n` +
            `**Roles given:** ${givenNames.join(", ")}`;

        await updateReviewMessage(request, decisionText).catch(error => {
            console.error("[ROLE REQUEST] Could not update review message:", error);
        });

        storage.updateRequest(requestId, {
            status: "accepted",
            approvedRoleIds: rolesToAdd,
        });

        const applicant = await request.guild.client.users
            .fetch(request.userId)
            .catch(() => null);

        let dmSent = false;

        if (applicant) {
            const dmContainer = buildDecisionContainer({
                headerImage: CONFIG.ACCEPTED_HEADER_IMAGE,
                userId: request.userId,
                reviewerId: interaction.user.id,
                message:
                    "Your role request has been accepted. You have automatically been given the following roles:\n\n" +
                    givenNames.join(", "),
            });

            try {
                await applicant.send({
                    components: [dmContainer],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] },
                });

                dmSent = true;
            } catch (error) {
                console.warn("[ROLE REQUEST] Could not DM applicant:", error.message);
            }
        }

        storage.deleteRequest(requestId);

        return interaction.followUp({
            content: dmSent
                ? `Approved. Assigned: ${givenNames.join(", ")}. The applicant was notified.`
                : `Approved and assigned: ${givenNames.join(", ")}. I could not DM the applicant.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
