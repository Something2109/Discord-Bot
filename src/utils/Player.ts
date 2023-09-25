import {
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { APIEmbedField } from "discord.js";
import ytdl from "ytdl-core";
import { Updater } from "./Updater";

interface AudioInfo {
  url: string;
  length: number;
  title: string;
}

export class Player {
  private _audioPlayer: AudioPlayer;
  private looping: boolean;
  private playing?: AudioInfo;
  private queue: Array<AudioInfo>;

  constructor(updater: Updater) {
    this._audioPlayer = createAudioPlayer()
      .on("stateChange", (oldState, newState) => {
        console.log(
          `Player transitioned from ${oldState.status} to ${newState.status}`
        );
      })
      .on("error", (error) => {
        console.error(`Audio Player Error: ${error.message} with resources`);
        updater.send({
          title: `Error when playing ${this.playing?.title}: ${error.message}`,
        });
      })
      .on(AudioPlayerStatus.Idle, () => {
        if (this.looping) {
          this.play();
        } else {
          this.playing = this.queue.shift();
          this.play();
        }
      })
      .on(AudioPlayerStatus.Playing, () => {
        updater.send({
          title: `Playing ${this.playing?.title}`,
          url: this.playing?.url,
          field: this.list(),
        });
      });
    this.looping = false;
    this.playing = undefined;
    this.queue = new Array<AudioInfo>();
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
        const resource = createAudioResource(stream);
        this._audioPlayer.play(resource);
      }
    }
  }

  /**
   * Validate the url string if it's a youtube link.
   * @param url The url to validate.
   * @returns The input url of undefined if not.
   */
  private validateUrl(url: string | null): string | undefined {
    let regExp =
      /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    let regExp2 =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    if (url?.match(regExp) || url?.match(regExp2)) {
      return url;
    }
    return undefined;
  }

  private async getVideoInfo(url: string): Promise<AudioInfo> {
    const info: ytdl.videoInfo = await ytdl.getBasicInfo(url);
    return {
      url,
      title: info.videoDetails.title,
      length: Math.ceil(parseInt(info.videoDetails.lengthSeconds) / 60),
    };
  }

  public get audioPlayer(): AudioPlayer {
    return this._audioPlayer;
  }

  /**
   * Add a song to the player queue.
   * @param url The link of the Youtube song.
   * @param title The title to represent in the list.
   * @param length The length of the song to allocate the buffer.
   * @param channel The channel of the sent request to send update.
   * @returns The reply string indicate the song added to the queue.
   */
  public async add(url: string | null): Promise<string> {
    let reply = "Invalid youtube url";
    if (url && this.validateUrl(url)) {
      try {
        const NewAudio = await this.getVideoInfo(url);
        if (!this.playing) {
          this.playing = NewAudio;
          this.play();
        } else {
          this.queue.push(NewAudio);
        }
        reply = `Added the song ${NewAudio.title} to the queue`;
      } catch (error) {
        console.log(error);
        reply = "Cannot add the song";
      }
    }
    return reply;
  }

  /**
   * Remove a song from the queue.
   * @param {number} number The number of the song in the queue.
   * @returns the reply string indicate the song removed from the queue.
   */
  public remove(number: number | null): string {
    let reply = "Failed to remove song from the queue";
    if (number && number > 0 && number <= this.queue.length) {
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
      this._audioPlayer.stop(true);
    }
    return reply;
  }

  /**
   * Stop the player from continue playing.
   * @returns The reply string.
   */
  public stop(): string {
    this.clearqueue();
    this.playing = undefined;
    this._audioPlayer.stop(true);
    return "Music stopped";
  }

  /**
   * Get a list of the songs in the queue.
   * @returns The embed field array of the songs in the queue.
   */
  public list(): Array<APIEmbedField> {
    let field = [];
    if (this.queue.length > 0) {
      field = this.queue.map((info, index) => ({
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
  public clearqueue(): string {
    this.queue.length = 0;
    return "Clear the queue";
  }

  /**
   * Pause the player.
   * @returns The reply string.
   */
  public pause(): string {
    return this._audioPlayer.pause()
      ? "Paused the player"
      : "Failed to pause the player";
  }

  /**
   * Make the player continue to play.
   * @returns The reply string.
   */
  public unpause(): string {
    return this._audioPlayer.unpause()
      ? "Unpaused the player"
      : "Failed to unpause the player";
  }

  /**
   * Make the player starts playing loop.
   * @returns The reply string.
   */
  loop() {
    this.looping = true;
    return "Start playing loop";
  }

  /**
   * Make the player stops playing loop.
   * @returns The reply string.
   */
  unloop() {
    this.looping = false;
    return "Stop playing loop";
  }
}
