module.exports = {
    name: "prune",
    aliases: ["delete"],
    description: "prune",
    execute(message, args) {
        const amount = parseInt(args[0]);

        if (isNaN(amount)) {
            return message.reply("that doesn't seem to be a valid number.");
        } else if (amount < 2 || amount > 100) {
            return message.reply(
                "you need to input a number between 2 and 100."
            );
        }

        message.channel.bulkDelete(amount);
    },
};
