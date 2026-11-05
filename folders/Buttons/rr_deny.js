
const {
    MessageFlags,
} = require("discord.js");

const {
    isStaff,
    buildDenyModal,
    storage,
} = require("../Utils/roleRequests/helpers");

module.exports = {
    customID: "rr_deny",

    async execute(interaction, client, args) {
        const requestId =
            args?.[0] ||
            interaction.customId.replace(/^rr_deny_/, "");

        const request = storage.getRequest(requestId);

        if (!request) {
            return interaction.reply({
                content: "This request could not be found. It may have expired or the bot may have restarted.",
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

        return interaction.showModal(
            buildDenyModal(requestId)
        );
    },
};
