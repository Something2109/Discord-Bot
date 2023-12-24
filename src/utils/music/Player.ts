import {
  AudioPlayer,
  createAudioResource,
  AudioPlayerStatus as Status,
  AudioPlayerState as State,
  AudioPlayerError as Error,
} from "@discordjs/voice";
import { Updater } from "../Updater";
import { Youtube } from "./Youtube";
import { Logger } from "../Logger";

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
  private logger: Logger;
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
    this.logger = new Logger("PLR");
    this.audioDownloader = new Youtube();
  }

  /**
   * Function executed when player state changes.
   * @param oldState The old state of the player.
   * @param newState The new state of the player.
   */
  private onStageChange(oldState: State, newState: State) {
    this.logger.log(
      `Player transitioned from ${oldState.status} to ${newState.status}`
    );
  }

  /**
   * Function executed when error happened.
   * @param error the player error.
   */
  private onError(error: Error) {
    this.logger.error(`Audio Player Error: ${error.message} with resources`);
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
    const message = `Playing ${this.playing?.title}`;
    this.updater.send({
      description: message,
      url: this.playing?.url,
    });
    this.logger.log(message);
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
        this.logger.log(`Added ${NewAudio.length} songs to the player queue`);
        return NewAudio;
      } catch (error) {
        const logError = error as Error;
        this.logger.error(logError.message);
      }
    }
    return [];
  }

  public remove(number: number | null): AudioInfo | undefined {
    if (number && number > 0 && number <= this.queue.length) {
      let removed = this.queue.splice(number - 1, 1);

      this.logger.log(`Removed ${removed[0].title} from the player queue`);
      return removed[0];
    }
    return undefined;
  }

  public skip(): AudioInfo | undefined {
    const oldSong = this.playing;
    super.stop(true);

    this.logger.log(`Skipped ${oldSong?.title} from playing`);
    return oldSong;
  }

  public stop(force?: boolean) {
    this.clearqueue();
    this.playing = undefined;

    this.logger.log(`Stopped the player`);
    return super.stop(true);
  }

  public get list() {
    return this.queue;
  }

  public clearqueue() {
    const oldQueue = this.queue;
    this.queue = [];

    this.logger.log(`cleared the player queue`);
    return oldQueue;
  }

  loop(): AudioInfo | undefined {
    this.looping = true;

    this.logger.log(`Started looping mode`);
    return this.playing;
  }

  unloop(): AudioInfo | undefined {
    this.looping = false;

    this.logger.log(`Stopped looping mode`);
    return this.playing;
  }
}

export { Player, DefaultPlayer, AudioInfo };
