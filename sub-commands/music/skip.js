module.exports = {
    name: "skip",
    description: "Skip song",
    usage: `play <youtube_url>`,
    requireQueue: true,

    execute(serverQueue, message, args) {
        if (!serverQueue)
            return message.channel.send("There is no song that I could skip!");
        serverQueue.dispatcher.end();
    },
};
