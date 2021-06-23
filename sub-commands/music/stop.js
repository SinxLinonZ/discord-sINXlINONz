module.exports = {
    name: "stop",
    description: "Stop playback",
    usage: `play <youtube_url>`,
    requireQueue: true,

    execute(serverQueue, message, args) {
        if (!serverQueue)
            return message.channel.send("There is no song that I could stop!");

        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    },
};
