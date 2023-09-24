const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class Player {
    #player;
    #looping;
    #playing;
    #queue;

    constructor(sendUpdateMessage) {
        this.#player = createAudioPlayer()
            .on('stateChange', (oldState, newState) => {
                console.log(`Player transitioned from ${oldState.status} to ${newState.status}`);
            })
            .on('error', error => {
                console.error(`Audio Player Error: ${error} with resources`);
                sendUpdateMessage({ message: `Cannot play ${this.#playing.title}` });
            })
            .on(AudioPlayerStatus.Playing, () => {
                sendUpdateMessage({
                    message: `Playing ${this.#playing.title}`,
                    url: this.#playing.url,
                    field: this.list()
                })
            })
            .on(AudioPlayerStatus.Idle, () => {
                if (this.#looping) {
                    this.#play();
                }
                else {
                    this.#playing = this.#queue.shift();
                    this.#play();
                }
            });
        this.#looping = false;
        this.#playing = undefined;
        this.#queue = [];
    }

    getPlayer() {
        return this.#player;
    }

    /**
     * Play the song saved in the #playing field.
     */
    #play() {
        if (this.#playing) {
            const stream = ytdl(this.#playing.url, {
                filter: 'audioonly',
                highWaterMark: this.#playing.length * 1024 * 1024,
            });
            if (stream) {
                const resource = createAudioResource(stream);
                this.#player.play(resource);
            }
        }
    }

    /**
     * Validate the url string if it's a youtube link. 
     * @param {*} url The url to validate.
     * @returns The input url of undefined if not.
     */
    #validateUrl(url) {
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
     * Add a song to the player queue.
     * @param {*} url The link of the Youtube song. 
     * @param {*} title The title to represent in the list.
     * @param {*} length The length of the song to allocate the buffer.
     * @returns The reply string indicate the song added to the queue.
     */
    async add(url) {
        let reply = "Invalid youtube url";
        if (this.#validateUrl(url)) {
            try {
                const info = await ytdl.getBasicInfo(url);
                const newAudio = {
                    url,
                    title: info.videoDetails.title,
                    length: Math.ceil(info.videoDetails.lengthSeconds / 60),
                };
                if (!this.#playing) {
                    this.#playing = newAudio;
                    this.#play();
                } else {
                    this.#queue.push(newAudio);
                }
                reply = `Added the song ${newAudio.title} to the queue`;
            } catch (error) {
                console.log(error);
                reply = "Cannot add the song";
            }
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
        this.#playing = undefined;
        return "Music stopped";
    }

    /**
     * Get a list of the songs in the queue.
     * @returns The string of the songs in the queue.
     */
    list() {
        let field = [];
        if (this.#queue.length > 0) {
            field = this.#queue.map((info, index) => ({
                name: `${index + 1}. ${info.title}`,
                value: info.url,
            }));
        } else {
            field.push({
                name: "Empty queue",
                value: "Use the /music add to add more songs to the queue",
            });
        }
        return field;
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
        return this.#player.pause() ?
            "Paused the player" :
            "Failed to pause the player";
    }

    /**
     * Make the player continue to play.
     * @returns The reply string.
     */
    unpause() {
        return this.#player.unpause() ?
            "Unpaused the player" :
            "Failed to unpause the player";
    }

    /**
     * Make the player starts playing loop.
     * @returns The reply string.
     */
    loop() {
        this.#looping = true;
        return "Start playing loop";
    }

    /**
     * Make the player stops playing loop.
     * @returns The reply string.
     */
    unloop() {
        this.#looping = false;
        return "Stop playing loop";
    }
}

module.exports = Player;