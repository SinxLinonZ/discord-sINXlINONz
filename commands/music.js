module.exports = {
    name: "music",
    description: "Play music",
    args: true,
    usage: ``,
    guildOnly: true,
    cooldown: 1,
    aliases: ["song"],
    hasSubcmd: true,

    // Load sub-commands
    // commands: SubCommands[`${this.name}`],

    execute(message, args) {
        // Check if commander is in a voice channel
        if (!message.member.voice.channel) {
            return message.channel.send(
                `${message.author} You have to be in a voice channel!`
            );
        }

        // Get server queue
        const serverQueue = MusicQueue.get(message.guild.id);

        // Get sub-command, do nothing if not exists
        const commandName = args.shift().toLowerCase();
        const command =
                SubCommands.get(this.name).get(commandName) ||
            // this.commands.get(commandName) ||
            // this.commands.find(
                SubCommands.get(this.name).find(
                (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
            );
        if (!command) return;

        // Handle err
        if (command.requireQueue && !serverQueue) {
            return message.channel.send(`No song's playing for now`);
        }

        // Run sub-command
        try {
            command.execute(serverQueue, message, args);
        } catch (error) {
            console.error(error);
            message.reply("there was an error trying to execute that command!");
        }





        return;


        const subCmd = args[0];

        if (subCmd == "play") {
            args.shift();
            this.postPlay(message, args, serverQueue);
            return;
        }

        if (!serverQueue) {
            return message.channel.send(`No song's playing for now`);
        }

        switch (subCmd) {
            case "skip":
                this.skip(message, serverQueue);
                break;
            case "stop":
                this.stop(message, serverQueue);
                break;
            case "volume":
                this.volume(message, serverQueue, args);
                break;
            case "queue":
                this.queue(message, serverQueue, args);
                break;
            case "pause":
                serverQueue.dispatcher.pause();
                break;
            case "resume":
                serverQueue.dispatcher.resume();
                break;
            default:
                message.channel.send("Invalid command");
                break;
        }
    },

    queue(message, serverQueue, args) {
        args.shift();

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

    volume(message, serverQueue, args) {
        if (!args[1]) {
            return message.channel.send(
                new Discord.MessageEmbed()
                    .setColor("#0096e0")
                    .setAuthor(`Current volume: ${serverQueue.volume}`)
            );
        }

        const volume = args[1];
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

        // For single song
        let songInfo = false;
        let song = false;

        // For playlist
        let songList = [];

        if (args[0].includes("playlist")) {
            const urlParams = new URLSearchParams(
                args[0].replace(/[^\?]*/, "")
            );
            const params = Object.fromEntries(urlParams.entries());

            message.channel.send(
                `Parsing playlist, this would take some time...`
            );
            let songs = await usetube.getPlaylistVideos(params["list"]);
            for (const _song of songs) {
                let _songInfo;
                try {
                    _songInfo = await ytdl.getInfo(_song["id"]);
                } catch (err) {
                    message.channel.send(
                        `Failed to fetch id \`${
                            _song["id"]
                        }\`.\n ${err.toString()}`
                    );
                    message.channel.send(`Continue parsing...`);
                    continue;
                }
                let __song = {
                    title: _songInfo.videoDetails.title,
                    url: _songInfo.videoDetails.video_url,
                };

                songList.push(__song);
            }
        } else {
            songInfo = await ytdl.getInfo(args[0]);
            song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
            };
        }

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

            if (song) {
                queueContruct.songs.push(song);
            } else {
                queueContruct.songs = songList;
                message.channel.send(
                    `${songList.length} songs has been added to the queue!`
                );
            }

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
            if (song) {
                queueContruct.songs.push(song);
                return message.channel.send(
                    `${song.title} has been added to the queue!`
                );
            } else {
                queueContruct.songs.push(songList);
                return message.channel.send(
                    `${songList.length} songs has been added to the queue!`
                );
            }
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
            .on("error", (error) => {
                console.error(error);
                serverQueue.textChannel.send(
                    "Somehting's wrong, contact admin!!!!!!"
                );
                // TODO: fix
            });
        dispatcher.setVolumeLogarithmic(1);
        dispatcher.setVolume(serverQueue.volume / 100);
        serverQueue.dispatcher = dispatcher;
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    },
};
