import {
  APIEmbedField,
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  User,
  userMention,
} from "discord.js";
import { Updater, DefaultUpdater } from "../utils/Updater";
import { Database } from "../utils/database/Database";
import { Ranking } from "../utils/database/List/WordList";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Word ranking");
const database = new Database();

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
  .setName("banned-word")
  .setDescription("Banned word ranking")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Add)
      .setDescription(description[Subcommand.Add])
      .addStringOption((option) =>
        option
          .setName("word")
          .setDescription("The word to ban")
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
          .setDescription("The word to unban")
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
      name: `#${index + 1}. Banned word count: ${count}`,
      value: id ? userMention(id) : word ? word : "",
    };
  });
}

const executor: {
  [key in Subcommand]: (interaction: InteractionType) => BaseMessageOptions;
} = {
  [Subcommand.Add]: (interaction) => {
    const word = interaction.options.getString("word")?.trim();
    const reply = database.add(word!)
      ? `Added the word ${word} from the banned list.`
      : `Failed to add the word`;

    return updater.message({
      description: reply,
    });
  },
  [Subcommand.List]: function (interaction) {
    const result = database.wordList();

    return updater.message(
      result.length > 0
        ? {
            description: "Banned word list",
            field: toRankingList(result),
          }
        : {
            description: "Empty list",
            field: [],
          }
    );
  },
  [Subcommand.Remove]: (interaction) => {
    const word = interaction.options.getString("word")?.trim();
    const reply = database.remove(word!)
      ? `Removed the word ${word} from the banned list.`
      : `Failed to remove the word`;

    return updater.message({
      description: reply,
    });
  },
  [Subcommand.Ranking]: function (interaction): BaseMessageOptions {
    const word = interaction.options.getString("word")?.trim();
    const user = interaction.options.getUser("user");

    const result = database.ranking(word, user?.id);
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

  const subcommand = interaction.options.getSubcommand() as Subcommand;
  const message: BaseMessageOptions = await executor[subcommand](interaction);

  await interaction.editReply(message);
}

export { data, execute };
