const { SlashCommandBuilder, ChatInputCommandInteraction } = require('discord.js');
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

/**
 * Function called when a start command is called.
 * @param {ChatInputCommandInteraction} interaction 
 * The start server interaction object.
 */
async function start(interaction) {
    let status = await Server.start();
    if (status) {
        await interaction.editReply("Server has already started");
    } else if (status === false) {
        await interaction.editReply("Starting server");
        testStartConnection(interaction);
    } else {
        await interaction.editReply("Server is in starting state");
    }

    let ngrokConnection = await Ngrok.start();
    if (ngrokConnection) {
        await interaction.followUp(`Running at ${ngrokConnection.public_url}`);
    } else {
        await interaction.followUp(`Ngrok is not running right now`);
    }
}

/**
 * Test the connection after starting the server.
 * @param {ChatInputCommandInteraction} interaction 
 * The start server interaction object.
 */
function testStartConnection(interaction) {
    let remainTestTime = 10
    let connectionTest = setInterval(() => {
        Server.isConnected().then((res) => {
            if (res) {
                interaction.followUp("Server has started");
                clearInterval(connectionTest);
            } else if (remainTestTime === 0) {
                interaction.followUp("Server failed to start");
                clearInterval(connectionTest);
            }
            remainTestTime--;
        })
    }, 5000);
}

/**
 * Function called when a stop command is called.
 * @param {ChatInputCommandInteraction} interaction 
 * The stop server interaction object.
 */
async function stop(interaction) {
    let status = await Server.stop();
    if (status) {
        await interaction.editReply("Stopping server");
        testStopConnection(interaction);
    } else if (status === false) {
        await interaction.editReply("Server has already stopped");
    } else {
        await interaction.editReply("Server is in starting state");
    }

    let ngrokConnection = await Ngrok.stop();
    if (ngrokConnection) {
        await interaction.followUp("Ngrok stopped successfully");
    } else {
        await interaction.followUp("Cannot stop Ngrok or it has been turned off");
    }
}

/**
 * Test the connection after stopping the server.
 * @param {ChatInputCommandInteraction} interaction 
 * The stop server interaction object.
 */
function testStopConnection(interaction) {
    let remainTestTime = 10
    let connectionTest = setInterval(() => {
        Server.isConnected().then((res) => {
            if (res == false) {
                interaction.followUp("Server has stopped");
                clearInterval(connectionTest);
            } else if (remainTestTime === 0) {
                interaction.followUp("Server failed to stop");
                clearInterval(connectionTest);
            }
            remainTestTime--;
        })
    }, 1000);
}

/**
 * Function called when an address command is called.
 * @param {ChatInputCommandInteraction} interaction 
 * The address server interaction object.
 */
async function address(interaction) {
    let tunnel = await Ngrok.connect();
    if (tunnel) {
        interaction.editReply(`Running at ${tunnel.public_url}`);
    } else {
        interaction.editReply('Ngrok is not working right now');
    }
}

/**
 * Function called when a status command is called.
 * @param {ChatInputCommandInteraction} interaction 
 * The status server interaction object.
 */
async function status(interaction) {
    let status = await Server.isConnected();
    if (status) {
        interaction.editReply('Server is running');
    } else if (status === false) {
        interaction.editReply('Server is not running');
    } else {
        interaction.editReply("Server is in starting state");
    }
}

module.exports = {
    data: data,
    async execute(interaction) {
        let username = interaction.user.username;
        let commandName = interaction.commandName
        let subcommand = interaction.options.getSubcommand();

        console.log(
            `[CMD]: ${username} commands ${commandName} ${subcommand}.`
        );

        await interaction.deferReply();

        switch (subcommand) {
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