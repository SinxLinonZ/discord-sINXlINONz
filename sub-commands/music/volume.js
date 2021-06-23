module.exports = {
    name: "volume",
    description: "Set playback volume",
    usage: `play <youtube_url>`,
    requireQueue: true,

    execute(serverQueue, message, args) {
        if (!args[0]) {
            return message.channel.send(
                new Discord.MessageEmbed()
                    .setColor("#0096e0")
                    .setAuthor(`Current volume: ${serverQueue.volume}`)
            );
        }

        const volume = args[0];
        if (volume > 200 || volume < 0) {
            return message.channel.send(
                new Discord.MessageEmbed()
                    .setColor("#c90000")
                    .setAuthor(`Invalid volume value!`)
            );
        }

        serverQueue.volume = volume;
        serverQueue.dispatcher.setVolume(serverQueue.volume / 100);
        serverQueue.textChannel.send(
            new Discord.MessageEmbed()
                .setColor("#0096e0")
                .setAuthor(`Set volume to ${serverQueue.volume}`)
        );
    },
};
