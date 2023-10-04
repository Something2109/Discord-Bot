import {
  PlayerSubscription,
  VoiceConnection,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { Player } from "./Player";

class Connection {
  private connection: VoiceConnection | undefined;
  private subscription: PlayerSubscription | undefined;

  /**
   * Create a connection to the voice channer the user is in.
   * @param channel The channel the user is in.
   */
  public joinVoice(channel: VoiceBasedChannel) {
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    this.connection.on("stateChange", (oldState, newState) => {
      console.log(
        `[MSC]: Connection transitioned from ${oldState.status} to ${newState.status}`
      );
    });
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(
            this.connection!,
            VoiceConnectionStatus.Signalling,
            5_000
          ),
          entersState(
            this.connection!,
            VoiceConnectionStatus.Connecting,
            5_000
          ),
        ]);
      } catch (error) {
        console.log(error);
        await this.leave();
      }
    });
  }

  /**
   * Check the voice connection of the user create the command.
   * If there is no voice connection then notify user to join one.
   * If in the different channel then leave the old connection and join the new one.
   * @param interaction The interaction command.
   * @returns True if the user has voice connection else false.
   */
  connect(channel: VoiceBasedChannel | null): boolean {
    if (channel) {
      if (!this.connection) {
        this.joinVoice(channel);
      } else if (channel.id !== this.connection.joinConfig.channelId) {
        this.subscription?.unsubscribe();
        this.connection.destroy();
        this.joinVoice(channel);
      }
      return true;
    }
    return false;
  }

  /**
   * Disconnect the connection to the current voice channel.
   * Clear the player queue.
   * @returns The reply string.
   */
  public async leave() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;

    this.connection?.destroy();
    this.connection = undefined;
  }

  public set subcribe(player: Player) {
    this.subscription = this.connection?.subscribe(player.audioPlayer);
  }
}

export { Connection };
