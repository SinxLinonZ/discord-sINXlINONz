module.exports = {
    name: "play",
    description: "Play music",
    args: true,
    usage: `play <youtube_url>`,
    requireQueue: false,

    async execute(serverQueue, message, args) {
        args = await this._parseArg(args);
        this._postPlay(serverQueue, message, args);
    },

    async _parseArg(args) {
        /**
         * type:            |['yt-video', 'yt-playlist']|
         * yt_videos:       ['url', 'url', ...]
         * yt_playlists:    ['url', 'url', ...]
         *
         * options:
         *      volume:     volume(0-200) *100
         *      order:      random | loop | loopq | *normal
         */
        let result = {
            type: new Set(),
            yt_videos: [],
            yt_playlists: [],
            options: {
                volume: 100,
                order: "normal",
            },
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // is playlist
            if (arg.includes("playlist?list=")) {
                result.type.add("yt-playlist");
                result.yt_playlists.push(arg);
            }

            // is option args
            else if (arg[0] == "-") {
                const option = arg.replace(/-*/, "");
                let optionArg = args[++i];

                // No option Arg
                if (
                    optionArg.includes("watch?v=") ||
                    optionArg.includes("playlist?list=") ||
                    optionArg == ""
                ) {
                    message.channel.send(
                        `Empty argument for option \`${option}\`, ignored.`
                    );
                    --i;
                    continue;
                }

                // Volume option
                if (option == "v" || option == "volume") {
                    const origin_optionArg = optionArg;
                    optionArg = parseInt(optionArg);
                    // Not a number
                    if (Number.isNaN(optionArg)) {
                        message.channel.send(
                            `Argument \`${origin_optionArg}\` for option \`${option}\` is *not a number*, ignored.`
                        );
                        continue;
                    }

                    // Out of range
                    if (optionArg > 200 || optionArg < 0) {
                        message.channel.send(
                            `*Invalid volume* \`${origin_optionArg}\`, ignored.`
                        );
                        continue;
                    }
                    // Valid volume value
                    else {
                        result.options.volume = optionArg;
                    }
                }
                // Playback order option
                else if (option == "o" || option == "order") {
                    const origin_optionArg = optionArg;
                    optionArg = optionArg.toLowerCase();

                    if (
                        optionArg != "normal" ||
                        optionArg != "random" ||
                        optionArg != "loop" ||
                        optionArg != "loopq"
                    ) {
                        message.channel.send(
                            `*Invalid order* \`${origin_optionArg}\`, ignored.`
                        );
                        continue;
                    } else {
                        this.option.order = optionArg;
                    }
                }
            }

            // is video or nothing
            else {
                result.type.add("yt-video");
                result.yt_videos.push(arg);
            }
        }

        return result;
    },

    async _postPlay(serverQueue, message, data) {
        /**
         * data:
         *
         * type:            |['yt-video', 'yt-playlist']|
         * yt_videos:       ['url', 'url', ...]
         * yt_playlists:    ['url', 'url', ...]
         *
         * options:
         *      volume:     volume(0-200) *100
         *      order:      random | loop | loopq | *normal
         */

        // Error handle
        const voiceChannel = message.member.voice.channel;

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel!"
            );
        }

        let songList = [];
        if (data.type.has("yt-video")) {
            for (const url of data.yt_videos) {
                let songInfo = await ytdl.getInfo(url);
                let song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                };

                songList.push(song);
            }
        }

        if (data.type.has("yt-playlist")) {
            for (const url of data.yt_playlists) {
                const urlParams = new URLSearchParams(
                    url.replace(/[^\?]*/, "")
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
            }
        }

        // Not playing
        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                dispatcher: null,
                songs: [],
                volume: data.options.volume,
                playing: true,
            };

            MusicQueue.set(message.guild.id, queueContruct);
            queueContruct.songs = songList;
            message.channel.send(
                `${songList.length} songs has been added to the queue!`
            );

            try {
                let connection = await voiceChannel.join();
                queueContruct.connection = connection;
                this._play(message.guild, queueContruct.songs[0]);
            } catch (err) {
                console.log(err);
                MusicQueue.delete(message.guild.id);
                return message.channel.send(err);
            }
        }

        // Playing
        else {
            const queueContruct = MusicQueue.get(message.guild.id);
            for (const song of songList) {
                queueContruct.songs.push(song);
            }
            return message.channel.send(
                `${songList.length} songs has been added to the queue!`
            );
        }
    },

    async _play(guild, song) {
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
                this._play(guild, serverQueue.songs[0]);
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
