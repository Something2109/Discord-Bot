const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class Player {
    #player;
    #loop;
    #playing;
    #queue;

    constructor() {
        this.#player = createAudioPlayer()
            .on('stateChange', (oldState, newState) => {
                console.log(`Player transitioned from ${oldState.status} to ${newState.status}`);
            })
            .on('error', error => {
                console.error(`Error: ${error.message} with resources`);
            })
            .on(AudioPlayerStatus.Idle, () => {
                if (this.#loop) {
                    this.#play();
                }
                else if (this.#queue.length > 0) {
                    this.#playing = this.queue.shift();
                    this.#play();
                } else {
                    this.#playing = undefined;
                }
            });
        this.#loop = false;
        this.#playing = undefined;
        this.#queue = [];
    }

    /**
     * Play the song saved in the #playing field.
     */
    #play() {
        const stream = ytdl(this.#playing.url, {
            filter: 'audioonly',
            highWaterMark: this.#playing.length * 1024 * 1024,
        });
        if (stream) {
            this.#playing.channel.send({
                content: `Playing ${this.#playing.title}`
            })
            const resource = createAudioResource(stream);
            this.#player.play(resource);
        }
    }

    getPlayer() {
        return this.#player;
    }

    /**
     * Add a song to the player queue.
     * @param {*} url The link of the Youtube song. 
     * @param {*} title The title to represent in the list.
     * @param {*} length The length of the song to allocate the buffer.
     * @param {*} channel The channel of the sent request to send update.
     * @returns The reply string indicate the song added to the queue.
     */
    add(url, title, length, channel) {
        let reply = `Added the song ${title} to the queue`;;
        if (!this.#playing) {
            this.#playing = { url, title, length, channel };
            this.#play();
        } else {
            this.#queue.push({ url, title, length, channel });
        }
        return reply;
    }

    /**
     * Remove a song from the queue.
     * @param {*} number The number of the song in the queue. 
     * @returns the reply string indicate the song removed from the queue.
     */
    remove(number) {
        let reply = "Failed to remove song from the queue";
        if (number > 0 && number <= this.#queue.length) {
            let removed = this.#queue.splice(number - 1, 1);
            reply = `Removed ${removed[0].title} from the queue.`;
        }
        return reply;
    }

    /**
     * Skip the playing song.
     * @returns The reply string indicate the skipped song.
     */
    skip() {
        let reply = "There's no song playing";
        if (this.#playing) {
            reply = `Skip the song ${this.#playing.title}`;
            this.#player.stop(true);
        }
        return reply;
    }

    /**
     * Stop the player from continue playing.
     * @returns The reply string.
     */
    stop() {
        this.clearqueue();
        this.#player.stop(true);
        return "Music stopped";
    }

    /**
     * Get a list of the songs in the queue.
     * @returns The string of the songs in the queue.
     */
    list() {
        let list = 'Empty queue';
        if (this.#queue.length > 0) {
            list = `Song queue:\n${this.#queue.map((song, index) =>
                `${index}. ${song.title}`).join('\n')}`;
        }
        return list;
    }

    /**
     * Clear the player queue.
     * @returns The reply string.
     */
    clearqueue() {
        this.#queue.length = 0;
        return "Clear the queue";
    }

    /**
     * Pause the player.
     * @returns The reply string.
     */
    pause() {
        let reply = "Failed to pause the player";
        if (this.#player.pause()) {
            reply = "Paused the player";
        }
        return reply;
    }

    /**
     * Make the player continue to play.
     * @returns The reply string.
     */
    unpause() {
        let reply = "Failed to unpause the player";
        if (this.#player.unpause()) {
            reply = "Unpaused the player";
        }
        return reply;
    }
}

module.exports = Player;