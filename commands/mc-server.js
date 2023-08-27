const { SlashCommandBuilder } = require('discord.js');
const Server = require('../util/Server');

const data = new SlashCommandBuilder()
    .setName('mc-server')
    .setDescription('Minecraft server command')
    .addSubcommand(subcommand =>
        subcommand
            .setName('start')
            .setDescription('Start the minecraft server')
    ).addSubcommand(subcommand =>
        subcommand
            .setName('address')
            .setDescription('Show the minecraft server\'s address')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Stop the minecraft server')
    );

async function start(interaction) {
    let server = await Server.start();
    if (server) {
        interaction.editReply("Server has already started");
    } else {
        interaction.editReply("Starting server");
        setTimeout(() => {
            Server.isConnected().then((res) => {
                if (res) {
                    interaction.followUp("Server has started");
                } else {
                    interaction.followUp("Server failed to start");
                }
            })
        }, 15000)
    }
}

async function stop(interaction) {
    let status = await Server.stop();
    if (status) {
        interaction.editReply("Server has been stopped");
    } else {
        interaction.editReply("Server has already stopped");
    }
}

module.exports = {
    data: data,
    async execute(interaction) {
        await interaction.deferReply();

        switch (interaction.options.getSubcommand()) {
            case 'start': {
                await start(interaction);
                break;
            }
            case 'stop': {
                await stop(interaction);
                break;
            }
            case 'address': {

                break;
            }
            default: {
                await interaction.editReply("Unknown command");
            }
        }
    },
};