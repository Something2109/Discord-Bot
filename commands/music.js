const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const Player = require('../utils/Player');

const data = new SlashCommandBuilder()
    .setName('music')
    .setDescription('Play music')
    .addSubcommand(subcommand =>
        subcommand.setName('add')
            .setDescription('Add a song to the player queue')
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('The Youtube url')))
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

const player = new Player();
let connection = undefined;
let subscription = undefined;

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
 * Validate the url string if it's a youtube link. 
 * @param {*} url The url to validate.
 * @returns The input url of undefined if not.
 */
function validateUrl(url) {
    if (url) {
        let regExp = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
        let regExp2 = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
        if (url.match(regExp) || url.match(regExp2)) {
            return url;
        }
    }
    return undefined;
}

/**
 * Add the song from the interraction to the player.
 * @param {*} interaction The interaction command.
 * @returns The reply string indicate the adding.
 */
async function add(interaction) {
    let reply = "Invalid youtube url";
    const url = interaction.options.getString('url');
    if (validateUrl(url)) {
        try {
            const info = await ytdl.getBasicInfo(url);
            reply = player.add(
                url,
                info.videoDetails.title,
                Math.ceil(info.videoDetails.lengthSeconds / 60),
                interaction.channel
            );
        } catch (error) {
            console.log(error);
            reply = "Cannot play the song";
        }
    }
    return reply;
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
        switch (subcommand) {
            case 'add': {
                let reply = await add(interaction);
                await interaction.reply(reply);
                break;
            }
            case 'remove': {
                const number = interaction.options.getNumber('number');
                await interaction.reply(player.remove(number));
                break;
            }
            case 'leave': {
                let reply = await leave();
                await interaction.reply(reply);
                break;
            }
            default: {
                await interaction.reply(player[subcommand]());
            }
        }
    }
}

module.exports = {
    data: data,
    execute
};