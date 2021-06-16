module.exports = {
    name: "music",
    description: "Play music",

    args: true,
    usage: `
    play <url>
    skip
    stop
    volume [volume to set]
    `,
    guildOnly: true,
    cooldown: 1,
    aliases: ["song"],

    execute(message, args) {
        if (!message.member.voice.channel) {
            return message.channel.send(
                `${message.author} You have to be in a voice channel!`
            );
        }

        const serverQueue = MusicQueue.get(message.guild.id);
        const subCmd = args[0];

        if (subCmd == "play") {
            this.postPlay(message, args, serverQueue);
            return;
        }

        if (!serverQueue) {
            return message.channel.send(`No song's playing for now`);
        }

        if (subCmd == "skip") {
            this.skip(message, serverQueue);
        } else if (subCmd == "stop") {
            this.stop(message, serverQueue);
        } else if (subCmd == "volume") {
            this.volume(message, serverQueue, args);
        } else if (subCmd == "pause") {
            this.pause(message, serverQueue);
        } else if (subCmd == "resume") {
            this.resume(message, serverQueue);
        } else {
            message.channel.send("Invalid command");
        }
    },

    pause(message, serverQueue) {
        serverQueue.dispatcher.pause();
    },

    resume(message, serverQueue) {
        serverQueue.dispatcher.resume();
    },

    volume(message, serverQueue, args) {
        if (!args[1]) {
            return message.channel.send(
                `Current volume: ${serverQueue.volume}`
            );
        }

        const volume = args[1];
        if (volume > 200 || volume < 0) {
            return message.channel.send("Invalid volume value!");
        }

        // let oldVolume = serverQueue.volume;
        // serverQueue.volume = volume;

        // let delayTime = 0;
        // if (serverQueue.volume < oldVolume) {
        //     while (oldVolume != serverQueue.volume) {
        //         --oldVolume;
        //         setTimeout(() => {
        //             serverQueue.dispatcher.setVolume(oldVolume / 100);
        //         }, delayTime);
        //         delayTime += 100;
        //     }
        // } else if (serverQueue.volume > oldVolume) {
        //     while (oldVolume != serverQueue.volume) {
        //         ++oldVolume;
        //         setTimeout(() => {
        //             serverQueue.dispatcher.setVolume(oldVolume / 100);                    
        //         }, delayTime);
        //         delayTime += 100;
        //     }
        // }
        
        serverQueue.volume = volume
        serverQueue.dispatcher.setVolume(serverQueue.volume / 100);
        serverQueue.textChannel.send(`Set volume to ${serverQueue.volume}`);
    },

    skip(message, serverQueue) {
        if (!serverQueue)
            return message.channel.send("There is no song that I could skip!");
        serverQueue.connection.dispatcher.end();
    },

    stop(message, serverQueue) {
        if (!serverQueue)
            return message.channel.send("There is no song that I could stop!");

        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    },

    async postPlay(message, args, serverQueue) {
        // Error handle
        const voiceChannel = message.member.voice.channel;

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel!"
            );
        }

        // Fetch song

        // args.shift();
        // args.forEach(async (url) => {
        // const songInfo = await ytdl.getInfo(url);
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
                dispatcher: null,
                songs: [],
                volume: 100,
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
            serverQueue.textChannel.send(`Queue ended. I'm leaving~~`);
            MusicQueue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(ytdl(song.url, { quality: "highestaudio" }))
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(guild, serverQueue.songs[0]);
            })
            .on("error", (error) => console.error(error));
        dispatcher.setVolumeLogarithmic(1);
        dispatcher.setVolume(serverQueue.volume / 100);
        serverQueue.dispatcher = dispatcher;
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    },
};
