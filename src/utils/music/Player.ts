import {
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import ytdl from "ytdl-core";
import { Updater } from "../Updater";

interface AudioInfo {
  url: string;
  length: number;
  title: string;
}

class Player {
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
          description: `Error when playing ${this.playing?.title}: ${error.message}`,
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
          description: `Playing ${this.playing?.title}`,
          url: this.playing?.url,
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
   * @returns The Audio info of the song added to the queue or undefined.
   */
  public async add(url: string | null): Promise<AudioInfo | undefined> {
    if (url && this.validateUrl(url)) {
      try {
        const NewAudio = await this.getVideoInfo(url);
        if (!this.playing) {
          this.playing = NewAudio;
          this.play();
        } else {
          this.queue.push(NewAudio);
        }
        return NewAudio;
      } catch (error) {
        console.log(error);
      }
    }
    return undefined;
  }

  /**
   * Remove a song from the queue.
   * @param {number} number The number of the song in the queue.
   * @returns the audio info of the song removed from the queue or undefined.
   */
  public remove(number: number | null): AudioInfo | undefined {
    if (number && number > 0 && number <= this.queue.length) {
      let removed = this.queue.splice(number - 1, 1);
      return removed[0];
    }
    return undefined;
  }

  /**
   * Skip the playing song.
   * @returns The audio info of the skipped song.
   */
  public skip(): AudioInfo | undefined {
    const oldSong = this.playing;
    this._audioPlayer.stop(true);
    return oldSong;
  }

  /**
   * Stop the player from continue playing.
   */
  public stop() {
    this.clearqueue();
    this.playing = undefined;
    this._audioPlayer.stop(true);
  }

  /**
   * Get a list of the songs in the queue.
   * @returns The audio info array of the songs in the queue.
   */
  public get list() {
    return this.queue;
  }

  /**
   * Clear the player queue.
   * @returns The old queue.
   */
  public clearqueue() {
    const oldQueue = this.queue;
    this.queue = [];
    return oldQueue;
  }

  /**
   * Pause the player.
   * @returns The reply string.
   */
  public pause(): boolean {
    return this._audioPlayer.pause();
  }

  /**
   * Make the player continue to play.
   * @returns The reply string.
   */
  public unpause(): boolean {
    return this._audioPlayer.unpause();
  }

  /**
   * Make the player starts playing loop.
   * @returns The audio info of the current (loop) song.
   */
  loop(): AudioInfo | undefined {
    this.looping = true;
    return this.playing;
  }

  /**
   * Make the player stops playing loop.
   * @returns The audio info of the current song.
   */
  unloop(): AudioInfo | undefined {
    this.looping = false;
    return this.playing;
  }
}

export { Player, AudioInfo };
