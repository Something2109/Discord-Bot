import {
  ChatInputCommandInteraction,
  GuildMember,
  SendableChannels,
  VoiceBasedChannel,
} from "discord.js";
import { Updater } from "../../utils/Updater";
import { AudioInfo, DefaultPlayer, Player } from "../../utils/music/Player";
import {
  BaseExecutor,
  OptionExtraction,
} from "../../utils/controller/Executor";
import {
  InteractionType,
  DiscordCommandController,
} from "../../utils/controller/Discord";
import { CustomClient } from "../../utils/Client";
import { CliCommandController } from "../../utils/controller/Console";

type MusicResult = string | AudioInfo[];

abstract class MusicSubcommand<
  Options extends OptionExtraction | undefined = undefined
> extends BaseExecutor<Options, MusicResult> {
  static player: Player = new DefaultPlayer();

  get player() {
    return MusicSubcommand.player;
  }
}

class DiscordMusicController<
  Options extends OptionExtraction | undefined = undefined
> extends DiscordCommandController<Options, MusicResult> {
  static readonly updater: Updater = new Updater("Music Player");

  constructor(executor: MusicSubcommand<Options>) {
    super(executor);
    MusicSubcommand.player.updater = DiscordMusicController.updater;
  }

  async preExecute(interaction: InteractionType) {
    if (interaction instanceof ChatInputCommandInteraction) {
      const client = interaction.client as CustomClient;

      DiscordMusicController.updater.channel =
        interaction.channel as SendableChannels;

      const member = interaction.member as GuildMember;
      const userVoiceChannel = member.voice.channel as VoiceBasedChannel;
      const status = client.connection.connect(userVoiceChannel);
      if (!status) {
        return DiscordMusicController.updater.send({
          description: "You need to join a voice channel to play the music",
        });
      }
      client.connection.subcribe = MusicSubcommand.player.player;
    }

    return undefined;
  }

  protected createAudio(audioList: AudioInfo[]) {
    return audioList.map((info, index) =>
      Updater.field(`${index + 1}. ${info.title}`, info.url)
    );
  }
}

class CliMusicController<
  Options extends OptionExtraction | undefined = undefined
> extends CliCommandController<Options, MusicResult> {
  constructor(executor: MusicSubcommand<Options>) {
    super(executor);
  }

  protected createAudio(audioList: AudioInfo[]) {
    return audioList.map((info, index) => `\t${index + 1}. ${info.title}`);
  }
}

export { MusicSubcommand, DiscordMusicController, CliMusicController };
