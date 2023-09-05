import {
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { TextBasedChannel } from "discord.js";
import ytdl from "ytdl-core";

interface AudioInfo {
  url: string;
  length: number;
  title: string;
  channel: TextBasedChannel;
}

export class Player {
  private player: AudioPlayer;
  private loop: boolean;
  private playing: AudioInfo | undefined;
  private queue: Array<AudioInfo>;

  constructor() {
    this.player = createAudioPlayer()
      .on("stateChange", (oldState, newState) => {
        console.log(
          `Player transitioned from ${oldState.status} to ${newState.status}`
        );
      })
      .on("error", (error) => {
        console.error(`Error: ${error.message} with resources`);
      })
      .on(AudioPlayerStatus.Idle, this.getNextSong);
    this.loop = false;
    this.playing = undefined;
    this.queue = [];
  }

  /**
   * Play the song saved in the #playing field.
   */
  private play() {
    if (this.playing) {
      const stream = ytdl(this.playing.url, {
        filter: "audioonly",
        highWaterMark: this.playing.length * 1024 * 1024,
      });
      if (stream) {
        this.playing.channel.send({
          content: `Playing ${this.playing.title}`,
        });
        const resource = createAudioResource(stream);
        this.player.play(resource);
      }
    }
  }

  private getNextSong() {
    if (this.loop) {
      this.play();
    } else if (this.queue.length > 0) {
      this.playing = this.queue.shift();
      this.play();
    } else {
      this.playing = undefined;
    }
  }

  public getPlayer(): AudioPlayer {
    return this.player;
  }

  /**
   * Add a song to the player queue.
   * @param {string} url The link of the Youtube song.
   * @param {string} title The title to represent in the list.
   * @param {number} length The length of the song to allocate the buffer.
   * @param {TextBasedChannel} channel The channel of the sent request to send update.
   * @returns The reply string indicate the song added to the queue.
   */
  public add(
    url: string,
    title: string,
    length: number,
    channel: TextBasedChannel
  ): string {
    let reply = `Added the song ${title} to the queue`;
    if (!this.playing) {
      this.playing = { url, title, length, channel };
      this.play();
    } else {
      this.queue.push({ url, title, length, channel });
    }
    return reply;
  }

  /**
   * Remove a song from the queue.
   * @param {number} number The number of the song in the queue.
   * @returns the reply string indicate the song removed from the queue.
   */
  public remove(number: number): string {
    let reply = "Failed to remove song from the queue";
    if (number > 0 && number <= this.queue.length) {
      let removed = this.queue.splice(number - 1, 1);
      reply = `Removed ${removed[0].title} from the queue.`;
    }
    return reply;
  }

  /**
   * Skip the playing song.
   * @returns The reply string indicate the skipped song.
   */
  public skip(): string {
    let reply = "There's no song playing";
    if (this.playing) {
      reply = `Skip the song ${this.playing.title}`;
      this.player.stop(true);
    }
    return reply;
  }

  /**
   * Stop the player from continue playing.
   * @returns The reply string.
   */
  public stop(): string {
    this.clearqueue();
    this.player.stop(true);
    return "Music stopped";
  }

  /**
   * Get a list of the songs in the queue.
   * @returns The string of the songs in the queue.
   */
  public list(): string {
    let list = "Empty queue";
    if (this.queue.length > 0) {
      list = `Song queue:\n${this.queue
        .map((song, index) => `${index}. ${song.title}`)
        .join("\n")}`;
    }
    return list;
  }

  /**
   * Clear the player queue.
   * @returns The reply string.
   */
  public clearqueue(): string {
    this.queue.length = 0;
    return "Clear the queue";
  }

  /**
   * Pause the player.
   * @returns The reply string.
   */
  public pause(): string {
    let reply = "Failed to pause the player";
    if (this.player.pause()) {
      reply = "Paused the player";
    }
    return reply;
  }

  /**
   * Make the player continue to play.
   * @returns The reply string.
   */
  public unpause(): string {
    let reply = "Failed to unpause the player";
    if (this.player.unpause()) {
      reply = "Unpaused the player";
    }
    return reply;
  }
}
