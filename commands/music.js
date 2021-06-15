module.exports = {
    name: "music",
    description: "Play music",

    args: true,
    usage: "<...args>",
    guildOnly: true,
    cooldown: 1,
    aliases: ["song"],

    execute(message, args) {
        const serverQueue = MusicQueue.get(message.guild.id);

        if (args[0] == "play") {
            this.postPlay(message, args, serverQueue);
        } else if (args[0] == "pause") {
            message.channel.send("pause");
        } else if (args[0] == "skip") {
            this.skip(message, serverQueue);
        } else if (args[0] == "stop") {
            this.stop(message, serverQueue);
        } else {
            message.channel.send("Invalid command");
        }
    },

    skip(message, serverQueue) {
        if (!message.member.voice.channel)
            return message.channel.send(
                "You have to be in a voice channel to stop the music!"
            );
        if (!serverQueue)
            return message.channel.send("There is no song that I could skip!");
        serverQueue.connection.dispatcher.end();
    },

    stop(message, serverQueue) {
        if (!message.member.voice.channel)
            return message.channel.send(
                "You have to be in a voice channel to stop the music!"
            );

        if (!serverQueue)
            return message.channel.send("There is no song that I could stop!");

        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    },

    async postPlay(message, args, serverQueue) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send(
                "You need to be in a voice channel to play music!"
            );
        }

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel!"
            );
        }

        // args.forEach(async (url) => {
        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
            };

            MusicQueue.set(message.guild.id, queueContruct);
            queueContruct.songs.push(song);

            try {
                let connection = await voiceChannel.join();
                queueContruct.connection = connection;
                this.play(message.guild, queueContruct.songs[0]);
            } catch (err) {
                console.log(err);
                MusicQueue.delete(message.guild.id);
                return message.channel.send(err);
            }
        } else {
            serverQueue.songs.push(song);
            return message.channel.send(
                `${song.title} has been added to the queue!`
            );
        }
        // });
    },

    async play(guild, song) {
        const serverQueue = MusicQueue.get(guild.id);
        if (!song) {
            serverQueue.voiceChannel.leave();
            MusicQueue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(ytdl(song.url, { quality: 'highestaudio' }))
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(guild, serverQueue.songs[0]);
            })
            .on("error", (error) => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    },
};
