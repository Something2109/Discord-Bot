const { SlashCommandBuilder } = require('discord.js');
const Server = require('../util/Server');
const Ngrok = require('../util/Ngrok');

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
    ).addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Show the status of the minecraft server')
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
        }, 15000);
    }

    let ngrokConnection = await Ngrok.start();
    if (ngrokConnection) {
        await interaction.followUp(`Running at ${ngrokConnection.public_url}`);
    } else {
        await interaction.followUp(`Ngrok is not running right now`);
    }
}

async function stop(interaction) {
    let status = await Server.stop();
    if (status) {
        await interaction.editReply("Server has been stopped");
    } else {
        await interaction.editReply("Server has already stopped");
    }

    let ngrokConnection = await Ngrok.stop();
    if (ngrokConnection) {
        await interaction.followUp("Ngrok stopped successfully");
    } else {
        await interaction.followUp("Cannot stop Ngrok or it has been turned off");
    }
}

async function address(interaction) {
    let tunnel = await Ngrok.connect();
    if (tunnel) {
        interaction.editReply(`Running at ${tunnel.public_url}`);
    } else {
        interaction.editReply('Ngrok is not working right now');
    }
}

async function status(interaction) {
    let status = await Server.isConnected();
    if (status) {
        interaction.editReply('Server is running');
    } else {
        interaction.editReply('Server is not running');
    }
}

module.exports = {
    data: data,
    async execute(interaction) {
        console.log(
            `[CMD]: ${interaction.user.username} commands ${interaction.commandName}.`
        );

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
                await address(interaction);
                break;
            }
            case 'status': {
                await status(interaction);
                break;
            }
            default: {
                await interaction.editReply("Unknown command");
            }
        }
    },
};