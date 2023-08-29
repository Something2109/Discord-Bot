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
            .setName('stop')
            .setDescription('Stop the minecraft server')
    ).addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Show the status of the minecraft server')
    );

const serverReply = {
    on: {
        start: "Server has already started",
        stop: "Stopping server",
        status: "Server is running",
    },
    off: {
        start: "Starting server",
        stop: "Server has already stopped",
        status: "Server is not running"
    },
    starting: {
        start: "Server is starting",
    },
    get(subcommand, status) {
        if (status) {
            return this.on[subcommand];
        } else if (status === false) {
            return this.off[subcommand];
        }
        return this.starting;
    }
}

/**
 * Test the connection after starting the server.
 * @param {} interaction 
 * The start server interaction object.
 */
function testConnection(interaction, onSuccess, onFail, status) {
    let remainTestTime = 10
    let connectionTest = setInterval(() => {
        Server.status().then((res) => {
            if (res && status) {
                interaction.followUp(onSuccess);
                clearInterval(connectionTest);
            } else if (res == false && !status) {
                interaction.followUp(onSuccess);
                clearInterval(connectionTest);
            } else if (remainTestTime === 0) {
                interaction.followUp(onFail);
                clearInterval(connectionTest);
            }
            remainTestTime--;
        })
    }, 1000);
}

module.exports = {
    data: data,
    async execute(interaction) {
        await interaction.deferReply();

        let subcommand = interaction.options.getSubcommand();

        let status = await Server[subcommand]();
        let tunnel = await Ngrok[subcommand]();

        if (tunnel) {
            reply = `${serverReply.get(subcommand, status)}\nNgrok running at ${tunnel.public_url}`;
        } else {
            reply = `${serverReply.get(subcommand, status)}\nNgrok is not running`;
        }

        await interaction.editReply(reply);

        if (subcommand == 'start' || subcommand == 'stop') {
            if (subcommand == 'start' ^ status) {
                testConnection(interaction,
                    onSuccess = `Server ${subcommand}s successfully`,
                    onFail = `Server fails to ${subcommand}`,
                    status = !status
                );
            }
        }
    },
};