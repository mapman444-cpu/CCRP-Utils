const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    StringSelectMenuBuilder,
} = require("discord.js");

const storage = require(require("path").join(__dirname, "storage"));

const CONFIG = {
    REVIEW_CHANNEL_ID: "1541992386157092875",
    REVIEW_ROLE_ID: "1520971125243515052",

    STAFF_ROLE_IDS: [
        "1520969944483889333",
        "1520971125243515052",
        "1554980684471468132",
        "1546705610417119433"
    ],

    REQUEST_HEADER_IMAGE: "https://cdn.discordapp.com/attachments/1556327940017623211/1558207013777965127/e29d65c1-b684-43dd-85c7-0588800a1b12.png?ex=6aecdfde&is=6aeb8e5e&hm=1cba189f3b7e868391a1898826b0278b77c6dd166f86e2e5c0522033a3ac51ec&",

    ACCEPTED_HEADER_IMAGE: "https://cdn.discordapp.com/attachments/1556327940017623211/1558207013777965127/e29d65c1-b684-43dd-85c7-0588800a1b12.png?ex=6aecdfde&is=6aeb8e5e&hm=1cba189f3b7e868391a1898826b0278b77c6dd166f86e2e5c0522033a3ac51ec&",

    DENIED_HEADER_IMAGE: "https://cdn.discordapp.com/attachments/1556327940017623211/1558207013777965127/e29d65c1-b684-43dd-85c7-0588800a1b12.png?ex=6aecdfde&is=6aeb8e5e&hm=1cba189f3b7e868391a1898826b0278b77c6dd166f86e2e5c0522033a3ac51ec&",

    FOOTER_IMAGE: "https://cdn.discordapp.com/attachments/1556327940017623211/1556332002536587465/Copy_of_Untitled_18.png?backend=b2&ex=6aeca520&is=6aeb53a0&hm=5a8a05e4e7a6498faa689e8a4bb3ed154641e762f93d5880c20d1dde341b5fae&",
};

function getConfig() {
    return CONFIG;
}

function isStaff(member) {
    if (!member || !CONFIG.STAFF_ROLE_IDS.length) return false;

    return CONFIG.STAFF_ROLE_IDS.some(roleId =>
        member.roles.cache.has(roleId)
    );
}

function getBotMember(guild) {
    return guild.members.me;
}

function isAssignableRole(role, guild) {
    const botMember = getBotMember(guild);

    if (!role || !botMember) return false;
    if (role.id === guild.id) return false;
    if (role.managed) return false;

    return role.position < botMember.roles.highest.position;
}

function getAssignableRoles(guild) {
    return guild.roles.cache.filter(role =>
        isAssignableRole(role, guild)
    );
}

function makeGallery(url) {
    if (!url) return null;

    return new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(url)
    );
}

function addImage(container, url) {
    const gallery = makeGallery(url);
    if (gallery) container.addMediaGalleryComponents(gallery);
}

function addSeparator(container) {
    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small)
    );
}

function makeReviewButtons(requestId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rr_accept_${requestId}`)
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),

        new ButtonBuilder()
            .setCustomId(`rr_deny_${requestId}`)
            .setLabel("Deny")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

function buildReviewContainer(request, decisionText = null) {
    const container = new ContainerBuilder();

    addImage(container, CONFIG.REQUEST_HEADER_IMAGE);
    addSeparator(container);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## User:\n<@${request.userId}>`
        )
    );

    const roleNames = request.roleIds
        .map(id => request.guild.roles.cache.get(id)?.name || "Deleted role")
        .join(", ");

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## Requested Roles:\n${roleNames || "No roles selected"}`
        )
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "## Proof:\nUploaded pictures"
        )
    );

    // Display proof pictures as small clickable thumbnails.
    if (request.proofUrls?.length) {
        request.proofUrls.forEach((url, index) => {
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Proof number ${index + 1}**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(url)
                );

            container.addSectionComponents(section);
        });
    }

    addSeparator(container);

    if (decisionText) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(decisionText)
        );
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> <@&${CONFIG.REVIEW_ROLE_ID}>`
            )
        );

        container.addActionRowComponents(
            makeReviewButtons(request.id)
        );
    }

    addImage(container, CONFIG.FOOTER_IMAGE);

    return container;
}

function buildDecisionContainer({
    headerImage,
    userId,
    message,
    reviewerId,
}) {
    const container = new ContainerBuilder();

    addImage(container, headerImage);
    addSeparator(container);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `<@${userId}>\n\n${message}`
        )
    );

    addSeparator(container);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `> Review by <@${reviewerId}>`
        )
    );

    addImage(container, CONFIG.FOOTER_IMAGE);

    return container;
}

function buildApprovalMenu(request) {
    const options = request.roleIds
        .map(id => request.guild.roles.cache.get(id))
        .filter(role => role && isAssignableRole(role, request.guild))
        .map(role => ({
            label: role.name.slice(0, 100),
            value: role.id,
        }));

    if (!options.length) return null;

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`rr_approve_roles_${request.id}`)
            .setPlaceholder("Choose the roles to give")
            .setMinValues(1)
            .setMaxValues(options.length)
            .addOptions(options)
    );
}

function buildDenyModal(requestId) {
    const {
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
    } = require("discord.js");

    const modal = new ModalBuilder()
        .setCustomId(`rr_deny_reason_${requestId}`)
        .setTitle("Deny Role Request");

    const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason for denial")
        .setPlaceholder("You have been denied because...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(reason)
    );

    return modal;
}

async function updateReviewMessage(request, decisionText) {
    const channel = await request.guild.channels
        .fetch(CONFIG.REVIEW_CHANNEL_ID)
        .catch(() => null);

    if (!channel || !channel.isTextBased()) return false;

    const message = await channel.messages
        .fetch(request.messageId)
        .catch(() => null);

    if (!message) return false;

    const container = buildReviewContainer(request, decisionText);

    await message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
    });

    return true;
}

module.exports = {
    CONFIG,
    getConfig,
    isStaff,
    isAssignableRole,
    getAssignableRoles,
    buildReviewContainer,
    buildDecisionContainer,
    buildApprovalMenu,
    buildDenyModal,
    makeReviewButtons,
    updateReviewMessage,
    storage,
};
