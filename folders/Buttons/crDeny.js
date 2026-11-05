const { ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { MessageFlags } = require("discord.js");
 
module.exports = {
  customID: "crDeny:button",
  execute: async function (interaction, client, args) {
    await interaction.update({
      components: [
        new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(
            `## Close Request Denied\n<@${interaction.user.id}> has denied the close request. The ticket will remain open.`,
          ), 
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

  