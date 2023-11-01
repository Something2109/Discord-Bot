import {
  AudioPlayer,
  createAudioResource,
  AudioPlayerStatus as Status,
  AudioPlayerState as State,
  AudioPlayerError as Error,
} from "@discordjs/voice";
import { Updater } from "../Updater";
import { Youtube } from "./Youtube";

interface Player {
  /**
   * Get the audio player to subcribe to the voice connection.
   * @returns The player.
   */
  get player(): AudioPlayer;

  /**
   * Add a song to the player queue.
   * @param url The link of the Youtube song.
   * @param title The title to represent in the list.
   * @param length The length of the song to allocate the buffer.
   * @param channel The channel of the sent request to send update.
   * @returns The Audio info of the song added to the queue or undefined.
   */
  add(url: string | null): Promise<AudioInfo[]>;

  /**
   * Remove a song from the queue.
   * @param {number} number The number of the song in the queue.
   * @returns the audio info of the song removed from the queue or undefined.
   */
  remove(number: number | null): AudioInfo | undefined;

  /**
   * Skip the playing song.
   * @returns The audio info of the skipped song.
   */
  skip(): AudioInfo | undefined;

  /**
   * Stop the player from continue playing.
   */
  stop(force?: boolean): boolean;

  /**
   * Get a list of the songs in the queue.
   * @returns The audio info array of the songs in the queue.
   */
  get list(): Array<AudioInfo>;

  /**
   * Clear the player queue.
   * @returns The old queue.
   */
  clearqueue(): Array<AudioInfo>;

  /**
   * Pause the player.
   * @returns The reply string.
   */
  pause(): boolean;

  /**
   * Make the player continue to play.
   * @returns The reply string.
   */
  unpause(): boolean;

  /**
   * Make the player starts playing loop.
   * @returns The audio info of the current (loop) song.
   */
  loop(): AudioInfo | undefined;

  /**
   * Make the player stops playing loop.
   * @returns The audio info of the current song.
   */
  unloop(): AudioInfo | undefined;
}

interface AudioInfo {
  url: string;
  length?: number;
  title: string;
}

class DefaultPlayer extends AudioPlayer implements Player {
  private looping: boolean;
  private playing?: AudioInfo;
  private queue: Array<AudioInfo>;
  private updater: Updater;
  private audioDownloader: Youtube;

  constructor(updater: Updater) {
    super();

    this.on("stateChange", this.onStageChange)
      .on("error", this.onError)
      .on(Status.Idle, this.onIdle)
      .on(Status.Playing, this.onPlaying);
    this.looping = false;
    this.playing = undefined;
    this.queue = new Array<AudioInfo>();
    this.updater = updater;
    this.audioDownloader = new Youtube();
  }

  /**
   * Function executed when player state changes.
   * @param oldState The old state of the player.
   * @param newState The new state of the player.
   */
  private onStageChange(oldState: State, newState: State) {
    console.log(
      `[PLR]: Player transitioned from ${oldState.status} to ${newState.status}`
    );
  }

  /**
   * Function executed when error happened.
   * @param error the player error.
   */
  private onError(error: Error) {
    console.error(`[PLR]: Audio Player Error: ${error.message} with resources`);
    this.updater.send({
      description: `Error when playing ${this.playing?.title}: ${error.message}`,
    });
  }

  /**
   * Function executed when the player changes to idle state.
   */
  private onIdle() {
    if (this.looping) {
      this.play();
    } else {
      this.playing = this.queue.shift();
      this.play();
    }
  }

  /**
   * Function executed when the player changes to playing state.
   */
  private onPlaying() {
    this.updater.send({
      description: `Playing ${this.playing?.title}`,
      url: this.playing?.url,
    });
  }

  /**
   * Play the song saved in the #playing field.
   */
  public play() {
    if (this.playing) {
      const stream = this.audioDownloader.source(this.playing.url);
      if (stream) {
        const resource = createAudioResource(stream);
        super.play(resource);
      }
    }
  }

  public get player(): AudioPlayer {
    return this;
  }

  public async add(str: string | null): Promise<AudioInfo[]> {
    if (str) {
      try {
        const NewAudio = await new Youtube().get(str);
        if (NewAudio) {
          this.queue = this.queue.concat(NewAudio);
          if (!this.playing) {
            this.playing = this.queue.shift();
            this.play();
          }
        }
        return NewAudio;
      } catch (error) {
        console.log(error);
      }
    }
    return [];
  }

  public remove(number: number | null): AudioInfo | undefined {
    if (number && number > 0 && number <= this.queue.length) {
      let removed = this.queue.splice(number - 1, 1);
      return removed[0];
    }
    return undefined;
  }

  public skip(): AudioInfo | undefined {
    const oldSong = this.playing;
    super.stop(true);
    return oldSong;
  }

  public stop(force?: boolean) {
    this.clearqueue();
    this.playing = undefined;
    return super.stop(true);
  }

  public get list() {
    return this.queue;
  }

  public clearqueue() {
    const oldQueue = this.queue;
    this.queue = [];
    return oldQueue;
  }

  loop(): AudioInfo | undefined {
    this.looping = true;
    return this.playing;
  }

  unloop(): AudioInfo | undefined {
    this.looping = false;
    return this.playing;
  }
}

export { Player, DefaultPlayer, AudioInfo };
