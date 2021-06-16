const fs = require("fs");
const Discord = require("discord.js");
const { prefix, token, defaultCooldown } = require("./config.json");
global.ytdl = require('ytdl-core');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const cooldowns = new Discord.Collection();


// Music bot queue
global.MusicQueue = new Discord.Collection();


// Load & set command files
const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once("ready", () => {
    console.log("bot started.");
});

client.once("reconnecting", () => {
    console.log("bot reconnecting.");
})

client.once("disconnect", () => {
    console.log("bot disconnected.");
})


client.on("message", (message) => {
    console.log(message.author.username + ":\t" + message.content);

    // Dirty code
    // if (!message.content.startsWith(prefix) || message.author.bot) {
    //     if (message.content.includes("gsq") && !message.author.bot) {
    //         message.channel.send("gsq? 傻逼咯");
    //     } else if (message.content.includes("lbq") && !message.author.bot) {
    //         message.channel.send("lbq? 傻逼咯");
    //     } else if (message.content.includes("大見") && !message.author.bot) {
    //         message.channel.send("大見？クソ野郎じゃね？");
    //     } else if ((message.content.includes("bot") || message.content.includes("机器人")) && !message.author.bot) {
    //         message.channel.send("阿？我不是阿，我没有阿，不要乱说");
    //     }
    //     else return;
    // };
    // End of dirty code

    // Get Input
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Search command
    const command =
        client.commands.get(commandName) ||
        client.commands.find(
            (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
        );

    if (!command) return;

    // Error handle
    if (command.guildOnly && message.channel.type === "dm") {
        return message.reply("I can't execute that command inside DMs!");
    }

    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);
    }

    // Cooldown
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || defaultCooldown) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime =
            timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(
                `please wait ${timeLeft.toFixed(
                    1
                )} more second(s) before reusing the \`${
                    command.name
                }\` command.`
            );
        }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Execute command
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply("there was an error trying to execute that command!");
    }
});

client.login(token);
