module.exports = {
    name: "queue",
    description: "Queue operations",
    usage: `play <youtube_url>`,
    requireQueue: true,

    execute(serverQueue, message, args) {
        if (args.length == 0) {
            let songQueue = "";
            for (let i = 0; i < serverQueue.songs.length; i++) {
                const song = serverQueue.songs[i];
                // embed.addField(`${i}`, `${song.title}`, false);
                songQueue += `${i}: ${song.title}\n`;
            }

            let embed = new Discord.MessageEmbed()
                .setColor("#0096e0")
                .setDescription(songQueue);

            message.channel.send(embed);
        } else {
            console.log(args);
        }
    },
};
