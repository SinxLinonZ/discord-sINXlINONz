module.exports = {
    name: "ping",
    description: "Ping!",
    execute(message, args) {
        message.channel.send("Pong.");

        const testEmbed = new Discord.MessageEmbed()
        .setColor('#c90000')
        .setTitle('DJ - sINXlINONz')
        .setDescription(`Set volume to ${null}`)
    
        message.channel.send(testEmbed);
    },
};
