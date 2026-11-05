const {
    SlashCommandBuilder,
    RoleSelectMenuBuilder,
    ActionRowBuilder,
    MessageFlags,
} = require("discord.js");

const crypto = require("crypto");

const {
    CONFIG,
    getAssignableRoles,
    buildReviewContainer,
    storage,
} = require("../Utils/roleRequests/helpers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role-request")
        .setDescription("Submit a request for server roles.")
        .addAttachmentOption(option =>
            option
                .setName("proof1")
                .setDescription("First proof picture")
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option
                .setName("proof2")
                .setDescription("Second proof picture")
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName("proof3")
                .setDescription("Third proof picture")
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName("proof4")
                .setDescription("Fourth proof picture")
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName("proof5")
                .setDescription("Fifth proof picture")
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({
                content: "You must use this command inside the server.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const reviewChannel = await interaction.guild.channels
            .fetch(CONFIG.REVIEW_CHANNEL_ID)
            .catch(() => null);

        if (!reviewChannel || !reviewChannel.isTextBased()) {
            return interaction.reply({
                content: "The role request review channel is not configured correctly.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const proofUrls = [];

        for (let i = 1; i <= 5; i++) {
            const attachment = interaction.options.getAttachment(`proof${i}`);

            if (!attachment) continue;

            if (!attachment.contentType?.startsWith("image/")) {
                return interaction.reply({
                    content: `Proof ${i} must be an image.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            proofUrls.push(attachment.url);
        }

        if (!proofUrls.length) {
            return interaction.reply({
                content: "You must upload at least one proof picture.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const assignableRoles = getAssignableRoles(interaction.guild);

        if (!assignableRoles.size) {
            return interaction.reply({
                content: "There are no assignable roles available.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const requestId = crypto.randomBytes(6).toString("hex");

        storage.createRequest({
            id: requestId,
            guild: interaction.guild,
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            roleIds: [],
            proofUrls,
            messageId: null,
            reviewerId: null,
        });

        const roleMenu = new RoleSelectMenuBuilder()
            .setCustomId(`rr_select_roles_${requestId}`)
            .setPlaceholder("Select the roles you are requesting")
            .setMinValues(1)
            .setMaxValues(25);

        await interaction.reply({
            content: "Select the roles you are requesting. You can select multiple roles.",
            components: [
                new ActionRowBuilder().addComponents(roleMenu),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },

    async handleComponentInteraction(interaction) {
        if (!interaction.isRoleSelectMenu()) return;

        if (!interaction.customId.startsWith("rr_select_roles_")) return;

        const requestId = interaction.customId.replace(
            "rr_select_roles_",
            ""
        );

        const request = storage.getRequest(requestId);

        if (
            !request ||
            request.userId !== interaction.user.id ||
            request.guildId !== interaction.guildId
        ) {
            return interaction.reply({
                content: "This role request has expired or does not belong to you.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (request.status !== "selecting") {
            return interaction.reply({
                content: "This request has already been submitted.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const selectedRoles = interaction.values || [];
        const assignableRoles = getAssignableRoles(interaction.guild);

        const validRoles = selectedRoles.filter(roleId =>
            assignableRoles.has(roleId)
        );

        if (
            !validRoles.length ||
            validRoles.length !== selectedRoles.length
        ) {
            storage.deleteRequest(requestId);

            return interaction.update({
                content: "One or more selected roles cannot be assigned. Please submit a new request.",
                components: [],
            });
        }

        storage.updateRequest(requestId, {
            roleIds: validRoles,
            status: "pending",
        });

        const updatedRequest = storage.getRequest(requestId);

        try {
            const reviewChannel = await interaction.guild.channels
                .fetch(CONFIG.REVIEW_CHANNEL_ID);

            if (!reviewChannel || !reviewChannel.isTextBased()) {
                throw new Error("Review channel is unavailable.");
            }

            const reviewContainer = buildReviewContainer(updatedRequest);

            const reviewMessage = await reviewChannel.send({
                components: [reviewContainer],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    roles: [CONFIG.REVIEW_ROLE_ID],
                },
            });

            storage.updateRequest(requestId, {
                messageId: reviewMessage.id,
            });

            return interaction.update({
                content: "Your role request has been submitted for staff review.",
                components: [],
            });

        } catch (error) {
            console.error("[ROLE REQUEST] Submission error:", error);

            storage.deleteRequest(requestId);

            return interaction.update({
                content: "I could not submit your request. Please contact staff.",
                components: [],
            });
        }
    },
};
