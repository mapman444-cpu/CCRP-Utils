
require("dotenv").config();

module.exports = {
    token: process.env.TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    guildId: process.env.GUILD_ID || "",
    mongoDBUri: process.env.MONGODB_URI || "",
    prcKey: process.env.PRC_KEY || "",

    registeredGuildIds: [
        "1545127165287473326",   // DEPT HUB
        "1520517822046802120",   // MAIN SERVER
        "1541589424595280004",   // CFD
        "1516069647823274144",   // ISP 
        "1540135476789379234",   // CPD
        "1517142551172218940",   // CCSO
        "1560468291841957911",   // NPS
        "1546310968387309663",   // ISOS
        "1546303303900463224",   // FBI
        "1523586387570458745",   // USMS
        "1562148677810786314",   // USSS
        "1537617655945764905"    // DOJ
    ],

    sessionChannelsByGuild: {
        "1545127165287473326": {  // MAIN SERV
            start: "1560824506854146231",
            vote: "1560824506854146231",
            shutdown: "1560824506854146231",
            full: "1560824506854146231",
            boost: "1560824506854146231",
        },

        "1520517822046802120": {  // DEPT HUB
            start: "1556315219192582295",
            vote: "1556315219192582295",
            shutdown: "1556315219192582295",
            full: "1556315219192582295",
            boost: "1556315219192582295",
        },
    },
};
