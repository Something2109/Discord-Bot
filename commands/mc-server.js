const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Server = require('../utils/Server');
const Ngrok = require('../utils/Ngrok');
const { createMessage } = require('../utils/utils');

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
        let serverReply = {
            name: "Minecraft server:",
            value: this.starting[subcommand]
        };

        if (status) {
            serverReply.value = this.on[subcommand];
        } else if (status === false) {
            serverReply.value = this.off[subcommand];
        }

        let ngrokReply = {
            name: "Ngrok:",
            value: tunnel ?
                `Ngrok running at ${tunnel.public_url}` :
                `Ngrok is not running`
        };

        return createMessage({
            message: `Command ${subcommand}:`,
            field: [serverReply, ngrokReply],
            actionRow: buttons.get(status)
        });
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
    let remainTestTime = process.env.SERVER_TEST_TIME;
    let connectionTest = setInterval(() => {
        Server.status().then((res) => {
            if (res == undefined) {
                return;
            } else if (res !== status && remainTestTime > 0) {
                remainTestTime--;
            } else {
                let buttonRow = buttons.get(res);
                interaction.followUp(
                    createMessage({
                        message: "Testing connection",
                        description: (res === status) ? onSuccess : onFail,
                        actionRow: buttonRow
                    })
                ).then(message => previousMsg = message);
                clearInterval(connectionTest);
            }
        })
    }, process.env.SERVER_TEST_INTERVAL);
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
        let [status, tunnel] = await Promise.all([
            Server[subcommand](), Ngrok[subcommand]()
        ])

        previousMsg = await interaction.editReply(reply.get(subcommand, status, tunnel));

        if ((subcommand == 'start' || subcommand == 'stop') && status == undefined) {
            testConnection(interaction,
                onSuccess = `Server ${subcommand}s successfully`,
                onFail = `Server fails to ${subcommand} in the test`,
                status = subcommand == 'start'
            );
        }
    },
};
