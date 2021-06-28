module.exports = {
    name: "skip",
    description: "Skip song",
    usage: `play <youtube_url>`,
    requireQueue: true,

    execute(serverQueue, message, args) {
        serverQueue.dispatcher.end();
    },
};
