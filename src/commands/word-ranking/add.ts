import { SlashCommandStringOption } from "discord.js";
import { InteractionType } from "../../utils/controller/Discord";
import {
  DiscordWordRankingController,
  WordRankingSubcommand,
} from "./template";

type Options = { word: string };

class AddCommand extends WordRankingSubcommand<Options> {
  constructor() {
    super("add", "Add word to ban");
  }

  async execute({ word }: Options) {
    if (this.wordList) {
      if (this.wordList.add(word.toString())) {
        return `Added the word ${word} to the tracking list.`;
      }
    }
    return `Failed to add the word`;
  }
}

class DiscordController extends DiscordWordRankingController<Options> {
  options = () => [
    new SlashCommandStringOption()
      .setName("word")
      .setDescription("The word to track")
      .setRequired(true),
  ];

  async extractOptions(interaction: InteractionType): Promise<Options> {
    if (interaction.isChatInputCommand()) {
      return { word: interaction.options.getString("word", true) };
    }
    return { word: "" };
  }
}

const Exe = new AddCommand();
const Discord = new DiscordController(Exe);

export { Discord };
