import { SlashCommandStringOption } from "discord.js";
import { InteractionType } from "../../utils/controller/Discord";
import {
  DiscordWordRankingController,
  WordRankingSubcommand,
} from "./template";

type Options = { word: string };

export class RemoveCommand extends WordRankingSubcommand<Options> {
  constructor() {
    super("remove", "Remove word from banned list");
  }

  async execute({ word }: Options) {
    if (this.wordList) {
      if (this.wordList.remove(word)) {
        return `Removed the word ${word} from the tracking list.`;
      }
    }
    return `Failed to remove the word`;
  }
}

class DiscordController extends DiscordWordRankingController<Options> {
  options = () => [
    new SlashCommandStringOption()
      .setName("word")
      .setDescription("The word to delete")
      .setRequired(true),
  ];

  async extractOptions(interaction: InteractionType): Promise<Options> {
    if (interaction.isChatInputCommand()) {
      return { word: interaction.options.getString("word", true) };
    }
    return { word: "" };
  }
}

const Exe = new RemoveCommand();
const Discord = new DiscordController(Exe);

export { Discord };
