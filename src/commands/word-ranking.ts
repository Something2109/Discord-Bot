import {
  APIEmbedField,
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  userMention,
} from "discord.js";
import { Updater, DefaultUpdater } from "../utils/Updater";
import { Database } from "../utils/database/Database";
import { BannedWordList, Ranking } from "../utils/database/List/WordList";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Word ranking");

enum Subcommand {
  Add = "add",
  List = "list",
  Remove = "remove",
  Ranking = "ranking",
}

const description: { [key in Subcommand]: string } = {
  [Subcommand.Add]: "Add word to ban",
  [Subcommand.Remove]: "Remove word from banned list",
  [Subcommand.Ranking]: "Show the local ranking of saying banned words",
  [Subcommand.List]: "Show the banned word list",
};

const data = new SlashCommandBuilder()
  .setName("word-ranking")
  .setDescription("Tracking and ranking words")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Add)
      .setDescription(description[Subcommand.Add])
      .addStringOption((option) =>
        option
          .setName("word")
          .setDescription("The word to track")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.List)
      .setDescription(description[Subcommand.List])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Remove)
      .setDescription(description[Subcommand.Remove])
      .addStringOption((option) =>
        option
          .setName("word")
          .setDescription("The word to delete")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Ranking)
      .setDescription(description[Subcommand.Ranking])
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to search")
      )
      .addStringOption((option) =>
        option.setName("word").setDescription("The word to search")
      )
  );

function toRankingList(list: Ranking[]): APIEmbedField[] {
  return list.map(({ id, word, count }, index) => {
    return {
      name: `#${index + 1}. Typed count: ${count}`,
      value: id ? userMention(id) : word ? word : "",
    };
  });
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType,
    wordList: BannedWordList
  ) => BaseMessageOptions;
} = {
  [Subcommand.Add]: (interaction, wordList) => {
    const word = interaction.options.getString("word")?.trim().toLowerCase();
    const reply = wordList.add(word!)
      ? `Added the word ${word} to the tracking list.`
      : `Failed to add the word`;

    return updater.message({
      description: reply,
    });
  },
  [Subcommand.List]: function (interaction, wordList) {
    const result = wordList.wordList();

    return updater.message(
      result.length > 0
        ? {
            description: "Tracking word list",
            field: toRankingList(result),
          }
        : {
            description: "Empty list",
            field: [],
          }
    );
  },
  [Subcommand.Remove]: (interaction, wordList) => {
    const word = interaction.options.getString("word")?.trim().toLowerCase();
    const reply = wordList.remove(word!)
      ? `Removed the word ${word} from the tracking list.`
      : `Failed to remove the word`;

    return updater.message({
      description: reply,
    });
  },
  [Subcommand.Ranking]: function (interaction, wordList): BaseMessageOptions {
    const word = interaction.options.getString("word")?.trim().toLowerCase();
    const user = interaction.options.getUser("user");

    const result = wordList.ranking(word, user?.id);
    return updater.message(
      result.length > 0
        ? {
            description: "Ranking",
            field: toRankingList(result),
          }
        : {
            description: "Empty list",
            field: [],
          }
    );
  },
};

/**
 * The main executioner of this command.
 * @param interaction The interaction object.
 */
async function execute(interaction: InteractionType) {
  await interaction.deferReply();

  const wordList = Database.get(interaction.guildId!)?.bannedWord;
  let message = updater.message({
    description: "Your guild is not supported this function.",
  });
  if (wordList) {
    const subcommand = interaction.options.getSubcommand() as Subcommand;
    message = await executor[subcommand](interaction, wordList);
  }

  await interaction.editReply(message);
}

export { data, execute };
