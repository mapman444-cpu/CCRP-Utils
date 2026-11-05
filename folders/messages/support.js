const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require("discord.js");

const STAFF_ROLES = ["1538953559507476491"];
const SUPPORT_CHANNEL_ID = "1541990845228650566";

const BANNER =
    "https://cdn.discordapp.com/attachments/1556327940017623211/1556329340881604658/Assistance_7.png?backend=b2&ex=6ae36826&is=6ae216a6&hm=a600d57fb9aeac3984aa606b56fea82030b6a069677da78ff49c1af1c98f5886&";

module.exports = {
    name: "support",
    description: "Send the support ticket panel to the support channel.",

    run: async (client, message, args) => {
        // Check staff permissions.
        const hasPermission = message.member?.roles.cache.some(role =>
            STAFF_ROLES.includes(role.id)
        );

        if (!hasPermission) {
            const reply = await message.reply({
                content: "You do not have permission to use this command.",
            }).catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        // Delete the command message.
        await message.delete().catch(() => {});

        // Find the support channel.
        const supportChannel = await client.channels
            .fetch(SUPPORT_CHANNEL_ID)
            .catch(() => null);

        if (!supportChannel || !supportChannel.isTextBased()) {
            const reply = await message.channel
                .send("Support channel not found or is not a text channel.")
                .catch(() => null);

            if (reply) {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }

            return;
        }

        const container = new ContainerBuilder()
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(BANNER)
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(false)
            )
            .addTextDisplayComponents(t =>
                t.setContent(
                    "**Welcome to <:CCRP:1554984707400142899> Chicago City Roleplay!**\n\n" +
                    "This is the official assistance hub for Chicago City Roleplay. Our staff team is here to provide reliable support and assist you with any questions or concerns. Please select the appropriate support category from the menu below.\n\n" +

                    "**General Support**\n" +
                    "<:Bullet:1542283706327240785> Community questions and inquiries\n" +
                    "<:Bullet:1542283706327240785> General assistance and troubleshooting\n\n" +

                    "**Internal Affairs Support**\n" +
                    "<:Bullet:1542283706327240785> Member and staff reports\n\n" +

                    "**Management Support**\n" +
                    "<:Bullet:1542283706327240785> Discord punishment appeals\n" +
                    "<:Bullet:1542283706327240785> In-game inquiries\n" +
                    "<:Bullet:1542283706327240785> Development questions and concerns\n\n" +

                    "**Partnership Support**\n" +
                    "<:Bullet:1542283706327240785> Partnership and affiliation inquiries\n\n" +

                    "**DM Moderation Policy**\n" +
                    "Chicago City Roleplay can take action regarding direct messages involving:\n" +
                    "<:Bullet:1542283706327240785> Advertisements sent through DMs\n" +
                    "<:Bullet:1542283706327240785> Server-related disrespect or harassment\n" +
                    "<:Bullet:1542283706327240785> Harassment or targeted abuse\n" +
                    "<:Bullet:1542283706327240785> Explicit images\n" +
                    "<:Bullet:1542283706327240785> Unauthorized or backstage recruitment\n" +
                    "<:Bullet:1542283706327240785> Other situations that violate our community standards\n\n" +
                    "Please use common sense when submitting a report and provide relevant information to help our staff review your concern."
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("support:menu")
                        .setPlaceholder("Select support type.")
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel("General Support")
                                .setValue("General"),

                            new StringSelectMenuOptionBuilder()
                                .setLabel("Internal Affairs Support")
                                .setValue("Internal"),

                            new StringSelectMenuOptionBuilder()
                                .setLabel("Management Support")
                                .setValue("Management"),

                            new StringSelectMenuOptionBuilder()
                                .setLabel("Partnership Support")
                                .setValue("Partnership")
                        )
                )
            );

        try {
            await supportChannel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });

            console.log("[SUPPORT] Support panel sent successfully.");
        } catch (error) {
            console.error("[SUPPORT] Failed to send support panel:", error);
        }
    },
};
