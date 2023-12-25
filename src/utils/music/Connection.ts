import {
  AudioPlayer,
  PlayerSubscription,
  VoiceConnection,
  VoiceConnectionState as State,
  VoiceConnectionStatus as Status,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { Logger } from "../Logger";

interface Connection {
  /**
   * Subcribe an audio player to let it play resources.
   */
  set subcribe(player: AudioPlayer);

  /**
   * Check the voice connection of the user create the command.
   * If there is no voice connection then notify user to join one.
   * If in the different channel then leave the old connection and join the new one.
   * @param interaction The interaction command.
   * @returns True if the user has voice connection else false.
   */
  connect(channel: VoiceBasedChannel | null): boolean;

  /**
   * Disconnect the connection to the current voice channel.
   * Clear the player queue.
   * @returns The reply string.
   */
  leave(): void;
}

class DefaultConnection implements Connection {
  private static voiceConnection: VoiceConnection | undefined;
  private static playerSubscription: PlayerSubscription | undefined;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("VOI");
  }

  /**
   * Create a connection to the voice channer the user is in.
   * @param channel The channel the user is in.
   */
  private joinVoice(channel: VoiceBasedChannel) {
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    this.connection.on("stateChange", this.onStageChange.bind(this));
    this.connection.on(Status.Disconnected, this.onDisconnected.bind(this));
  }

  /**
   * Function executed when connection stage changes.
   * @param oldState The old state of the connection.
   * @param newState The new state of the connection.
   */
  private onStageChange(oldState: State, newState: State) {
    this.logger.log(
      `Connection transitioned from ${oldState.status} to ${newState.status}`
    );
  }

  /**
   * Function executed when connection is disconnected.
   */
  private async onDisconnected() {
    try {
      await Promise.race([
        entersState(this.connection!, Status.Signalling, 5_000),
        entersState(this.connection!, Status.Connecting, 5_000),
      ]);
    } catch (error) {
      this.logger.error(error);
      await this.leave();
    }
  }

  private get connection(): VoiceConnection | undefined {
    return DefaultConnection.voiceConnection;
  }

  private set connection(connection: VoiceConnection | undefined) {
    DefaultConnection.voiceConnection = connection;
  }

  private get subscription(): PlayerSubscription | undefined {
    return DefaultConnection.playerSubscription;
  }

  private set subscription(subscription: PlayerSubscription | undefined) {
    DefaultConnection.playerSubscription = subscription;
  }

  public set subcribe(player: AudioPlayer) {
    this.subscription = this.connection?.subscribe(player);
  }

  public connect(channel: VoiceBasedChannel | null): boolean {
    if (!this.connection && channel) {
      this.connection = getVoiceConnection(channel.guildId);
    }

    if (channel) {
      if (!this.connection) {
        this.joinVoice(channel);
      } else if (channel.id !== this.connection.joinConfig.channelId) {
        this.subscription?.unsubscribe();
        this.connection.destroy();
        this.joinVoice(channel);
      }

      this.logger.log(`Connected to ${channel.name}`);
      return true;
    }
    return false;
  }

  public leave() {
    this.subscription?.player.stop();

    this.subscription?.unsubscribe();
    this.subscription = undefined;

    this.connection?.destroy();
    this.connection = undefined;

    this.logger.log("Left the current voice channel");
  }
}

export { Connection, DefaultConnection };
