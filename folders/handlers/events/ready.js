const { 
  Events, 
  ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(readyClient) {
    console.log(`Logged in as ${readyClient.user.tag}`);
    console.log('Status set as Online')

    const statuses = [
      { name: 'Chigago City Roleplay', type: ActivityType.Playing },
      { name: 'Watching over the CCRP staff team', type: ActivityType.Watching },
      { name: 'Listening to everyone except Santa', type: ActivityType.Listening}
    ];

    let currentIndex = 0;

    readyClient.user.setPresence({
      activities: [statuses[currentIndex]],
      status: 'online',
    });

    setInterval(() => {
      currentIndex = (currentIndex + 1) % statuses.length;
      
      readyClient.user.setPresence({
        activities: [statuses[currentIndex]],
        status: 'online',
      });
    }, 5000); //  Change this number to slow down or speed up the changing status's
  },
};
 