const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
} = require("discord.js");
const { getRobloxInfo } = require("../Utils/docksystem");
const SupportModel = require("../Database/Models/SupportModel");

const TICKET_ROLES = {
  General: ["1546705610417119433, 1520969944483889333, 1554980684471468132, 1520983649363951716, 1520971125243515052"], // DONE
  Internal: ["1520983649363951716, 1546705610417119433, 1520971125243515052, 1554980684471468132, 1520969944483889333"], // DONE
  Management: ["1520971125243515052, 1546705610417119433, 1554980684471468132, 1520969944483889333"], // DONE
  partnership: ["1546705610417119433, 1520969944483889333, 1554980684471468132"] // DONE
};

const CATEGORIES = {
  General: "1525737455540506705",
  Internal: "1525737407142559816",
  Management: "1525737508573282460",
  partnership: "1564780742909624350",
};

const TYPE_LABELS = {
  General: "General Support",
  Internal: "Internal Affairs Support",
  Management: "Management Support",
  Partnership: "Partnership Support"
};

const BANNERS = {
  General: "https://media.discordapp.net/attachments/1556327940017623211/1556329340881604658/Assistance_7.png?backend=b2&ex=6ae36826&is=6ae216a6&hm=a600d57fb9aeac3984aa606b56fea82030b6a069677da78ff49c1af1c98f5886&=&format=webp&quality=lossless",
  Internal: "https://media.discordapp.net/attachments/1556327940017623211/1556329340881604658/Assistance_7.png?backend=b2&ex=6ae36826&is=6ae216a6&hm=a600d57fb9aeac3984aa606b56fea82030b6a069677da78ff49c1af1c98f5886&=&format=webp&quality=lossless",
  Management: "https://media.discordapp.net/attachments/1556327940017623211/1556329340881604658/Assistance_7.png?backend=b2&ex=6ae36826&is=6ae216a6&hm=a600d57fb9aeac3984aa606b56fea82030b6a069677da78ff49c1af1c98f5886&=&format=webp&quality=lossless",
  Partnership: "https://media.discordapp.net/attachments/1556327940017623211/1556329340881604658/Assistance_7.png?backend=b2&ex=6ae36826&is=6ae216a6&hm=a600d57fb9aeac3984aa606b56fea82030b6a069677da78ff49c1af1c98f5886&=&format=webp&quality=lossless"
};

module.exports = {
  customID: "support:menu",
  execute: async function (interaction, client, args) {
    const { user } = interaction;
    const type = interaction.values[0];
    const label = TYPE_LABELS[type];

    const existing = await SupportModel.findOne({
      userId: user.id,
      type,
    }).catch(() => null);
    if (existing) {
      return interaction.reply({
        components: [
          new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent(
              `You already have an open **${label}** ticket: <#${existing.channelId}>`,
            ),
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`support:ticketreason_${type}`)
      .setTitle(`${label} - Reason`);

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Please describe your issue")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Enter the reason for your ticket...")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

    return interaction.showModal(modal);
  },
};

