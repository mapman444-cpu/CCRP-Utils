const {
    SlashCommandBuilder,
    TextInputBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js')
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-feedback')
        .setDescription('Submit staff feedback')
        .addUserOption(option => option
            .setName("staff")
            .setDescription("The staff you want to give a feedback")
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("rating")
            .setDescription("Choose the rating for the staff")
            .setRequired(true)
            .addChoices(
                { name: "5 Stars", value: 5},
                { name: "4 Stars", value: 4},
                { name: "3 Stars", value: 3},
                { name: "2 Stars", value: 2},
                { name: "1 Star", value: 1}
            )
        )
        .addStringOption(option => option
            .setName("feedback")
            .setDescription("The feedback you want to give the staff")
            .setRequired(true)
        ),

    async execute(interaction){
        const staff = interaction.options.getUser("staff");
        const rating = interaction.options.getInteger("rating");
        const feedback = interaction.options.getString("feedback");

        const fChannel = await interaction.guild.channels.cache.get("1541993299055869962"); // change this with your own

        let displayRating = rating;

        if (displayRating.length > 200) {
            displayRating = displayRating.slice(0, 197) + "...";
    }

        const stars = ":star:".repeat(rating); // change this with your own

        const feedbackContainer = new ContainerBuilder()
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems({
                    media: {
                    url: "https://cdn.discordapp.com/attachments/1556327940017623211/1558610786119712798/Leadership_Information_2.png?ex=6ae27a68&is=6ae128e8&hm=1ea9c2de5792fb89464b07d3a258831113f1ca65eddaa8de988be834ce44d077&"
                    }
                })
            ) 

            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`- **Staff**: ${staff}\n- **Rating**: ${stars}\n- **Feedback**: ${feedback}`)
            )
            
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Feedback sent by ${interaction.user}`)
            )

            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )

            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems({
                    media: {
                    url: "https://cdn.discordapp.com/attachments/1556327940017623211/1556332002536587465/Copy_of_Untitled_18.png?backend=b2&ex=6aeca520&is=6aeb53a0&hm=5a8a05e4e7a6498faa689e8a4bb3ed154641e762f93d5880c20d1dde341b5fae&" 
                    }
                })
            )
        await fChannel.send({
            components: [feedbackContainer],      
            flags: MessageFlags.IsComponentsV2,
        });

        await interaction.reply({
            content: "Feedback sent sucessfully!",
            flags: 64
        })
    }
}
 