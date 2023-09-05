const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Server } = require('../utils/Server');
const { Ngrok } = require('../utils/Ngrok');

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

const reply = {
    on: {
        start: "Server has already started",
        stop: "Failed to stop server",
        status: "Server is running",
    },
    off: {
        start: "Failed to start server",
        stop: "Server has already stopped",
        status: "Server is not running"
    },
    starting: {
        start: "Server is starting",
        stop: "Server is stopping",
        status: "Server is starting or stopping"
    },
    get(subcommand, status, tunnel) {
        let serverReply = this.starting[subcommand];
        let ngrokReply = `Ngrok is not running`;

        if (status) {
            serverReply = this.on[subcommand];
        } else if (status === false) {
            serverReply = this.off[subcommand];
        }

        if (tunnel) {
            ngrokReply = `Ngrok running at ${tunnel.public_url}`;
        }

        return `${serverReply}\n${ngrokReply}`;
    }
}

const buttons = {
    start: new ButtonBuilder()
        .setCustomId(`${data.name} start`)
        .setLabel('Start')
        .setStyle(ButtonStyle.Success),
    stop: new ButtonBuilder()
        .setCustomId(`${data.name} stop`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger),
    status: new ButtonBuilder()
        .setCustomId(`${data.name} status`)
        .setLabel('Status')
        .setStyle(ButtonStyle.Secondary),
    get(status) {
        if (status) {
            return new ActionRowBuilder()
                .addComponents(this.status, this.stop);
        } else if (status == false) {
            return new ActionRowBuilder()
                .addComponents(this.start, this.status);
        } else {
            return undefined;
        }
    }
}

let previousMsg = undefined;
const server = new Server();
const ngrok = new Ngrok();

/**
 * Get the subcommand to progress to the server.
 * @param {} interaction 
 * @returns The needed subcommand.
 */
function getSubcommand(interaction) {
    let subcommand = undefined;
    if (interaction.isChatInputCommand()) {
        subcommand = interaction.options.getSubcommand();
    } else if (interaction.isButton()) {
        [command, subcommand, ...arg] = interaction.customId.split(' ');
    }
    console.log(`[CMD]: Executing command mc-server ${subcommand}`)
    return subcommand;
}

/**
 * Test the connection after starting or stopping the server.
 * @param {} interaction 
 * The interaction object.
 */
function testConnection(interaction, onSuccess, onFail, status) {
    let remainTestTime = 10
    let connectionTest = setInterval(() => {
        server.status().then((res) => {
            if (res == undefined) {
                return;
            } else if (res !== status && remainTestTime > 0) {
                remainTestTime--;
            } else {
                let buttonRow = buttons.get(res);
                interaction.followUp({
                    content: (res === status) ? onSuccess : onFail,
                    components: (buttonRow) ? [buttonRow] : []
                }).then(message => previousMsg = message);
                clearInterval(connectionTest);
            }
        })
    }, 1000);
}

module.exports = {
    data: data,
    async execute(interaction) {
        if (previousMsg) {
            await previousMsg.edit({
                components: []
            })
        }

        await interaction.deferReply();

        let subcommand = getSubcommand(interaction);
        let status = await server[subcommand]();
        let tunnel = await ngrok[subcommand]();
        let buttonRow = buttons.get(status);

        previousMsg = await interaction.editReply({
            content: reply.get(subcommand, status, tunnel),
            components: (buttonRow) ? [buttonRow] : []
        });

        if ((subcommand == 'start' || subcommand == 'stop') && status == undefined) {
            testConnection(interaction,
                onSuccess = `Server ${subcommand}s successfully`,
                onFail = `Server fails to ${subcommand} in the test`,
                status = subcommand == 'start'
            );
        }
    },
};