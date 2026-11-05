
const {
    MessageFlags,
} = require("discord.js");

const {
    isStaff,
    buildApprovalMenu,
    storage,
} = require("../Utils/roleRequests/helpers");

module.exports = {
    customID: "rr_accept",

    async execute(interaction) {
        const requestId = interaction.customId.replace("rr_accept_", "");
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

        const menu = buildApprovalMenu(request);

        if (!menu) {
            return interaction.reply({
                content: "None of the requested roles can currently be assigned.",
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            content: "Choose which requested roles should be awarded.",
            components: [menu],
            flags: MessageFlags.Ephemeral,
        });
    },
};
