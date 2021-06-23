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
    }
};