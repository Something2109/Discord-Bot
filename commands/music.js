const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const Player = require('../utils/Player');

const data = new SlashCommandBuilder()
    .setName('music')
    .setDescription('Play music')
    .addSubcommand(subcommand =>
        subcommand.setName('add')
            .setDescription('Add a song to the player queue')
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('The Youtube url')
                    .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand.setName('remove')
            .setDescription('Remove the specified song from the queue')
            .addNumberOption(option =>
                option.setName('number')
                    .setDescription('The place of the song in the queue')
                    .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand.setName('leave')
            .setDescription('Force the player to leave channel'))
    .addSubcommand(subcommand =>
        subcommand.setName('skip')
            .setDescription('Skip to the next songs in the queue'))
    .addSubcommand(subcommand =>
        subcommand.setName('stop')
            .setDescription('Stop the player'))
    .addSubcommand(subcommand =>
        subcommand.setName('list')
            .setDescription('List the songs in the player queue'))
    .addSubcommand(subcommand =>
        subcommand.setName('clearqueue')
            .setDescription('Clear the player queue'))
    .addSubcommand(subcommand =>
        subcommand.setName('pause')
            .setDescription('Pause the player'))
    .addSubcommand(subcommand =>
        subcommand.setName('unpause')
            .setDescription('Unpause the player to leave channel'));

const player = new Player(sendUpdateMessage);
let connection = undefined;
let subscription = undefined;
let updateChannel = undefined;

/**
 * Create the message to send to the discord channel.
 * @param message The message string to send.
 * @param url The optional url of the message.
 * @param showQueue The indicator to show the music queue in the message.
 * @returns The message object to send.
 */
function createMessage(message, url, description, field) {
    const embed = {
        color: 0x0099ff,
        title: message,
        url,
        description,
        fields: field,
    };
    return {
        embeds: [embed],
    };
}

function sendUpdateMessage(message, url, description, field) {
    updateChannel.send(createMessage(message, url, description, field));
};

/**
 * Create a connection to the voice channer the user is in.
 * @param {*} channel The channel the user is in. 
 */
function create(channel) {
    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
    connection.on('stateChange', (oldState, newState) => {
        console.log(`Connection transitioned from ${oldState.status} to ${newState.status}`);
    });
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch (error) {
            console.log(error);
            await leave();
        }
    });

    subscription = connection.subscribe(player.getPlayer());
}

/**
 * Add the song from the interraction to the player.
 * @param {*} interaction The interaction command.
 * @returns The reply string indicate the adding.
 */
async function connect(interaction) {
    if (!interaction.member.voice.channel) {
        await interaction.reply("You need to join a voice channel to play the music");
    } else {
        if (!connection) {
            create(interaction.member.voice.channel);
        } else if (interaction.member.voice.channel.id !== connection.joinConfig.channelId) {
            subscription.unsubscribe();
            connection.destroy();
            create(interaction.member.voice.channel);
        }
        return true;
    }
    return false
}

/**
 * Disconnect the connection to the current voice channel.
 * Clear the player queue.
 * @returns The reply string.
 */
async function leave() {
    player.stop();

    subscription.unsubscribe();
    subscription = undefined;

    connection.destroy();
    connection = undefined;

    return "Left the voice channel";
}

/**
 * The main executioner of this command.
 * @param {*} interaction The interaction object.
 */
async function execute(interaction) {
    let subcommand = interaction.options.getSubcommand();
    updateChannel = interaction.channel;

    await interaction.deferReply();
    let status = await connect(interaction);
    if (status) {
        switch (subcommand) {
            case 'add': {
                const url = interaction.options.getString('url');
                const reply = await player.add(url, interaction.channel);
                await interaction.editReply(createMessage(reply, url));
                break;
            }
            case 'remove': {
                const number = interaction.options.getNumber('number');
                const reply = player.remove(number);
                await interaction.editReply(createMessage(reply));
                break;
            }
            case 'list': {
                const reply = "List of songs in the queue";
                const queue = player.list();
                await interaction.editReply(createMessage(reply, null, null, queue));
                break;
            }
            case 'leave': {
                const reply = await leave();
                await interaction.editReply(createMessage(reply));
                break;
            }
            default: {
                await interaction.editReply(createMessage(player[subcommand]()));
            }
        }
    }
}

module.exports = {
    data: data,
    execute
};