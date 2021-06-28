module.exports = {
    name: "stop",
    description: "Stop playback",
    usage: `play <youtube_url>`,
    requireQueue: true,

    execute(serverQueue, message, args) {
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    },
};
