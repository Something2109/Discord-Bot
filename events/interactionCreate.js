const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        let commandName = undefined;

        if (interaction.isChatInputCommand()) {
            commandName = interaction.commandName;
        } else if (interaction.isButton()) {
            [commandName, ...arg] = interaction.customId.split(' ');
        }

        command = interaction.client.commands.get(commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        } else {
            console.log(
                `[CMD]: ${interaction.user.username} commands ${commandName}.`
            );
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);
        }
    },
};
