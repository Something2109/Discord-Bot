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
  Remove = "remove",
  Ranking = "ranking",
}

const description: { [key in Subcommand]: string } = {
  [Subcommand.Add]: "Add word to ban",
  [Subcommand.Remove]: "Remove word from banned list",
  [Subcommand.Ranking]: "Show the local ranking of saying banned words",
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
    const word = interaction.options.getString("word");
    database.bannedWord = word!;

    return updater.message({
      description: `Added the word ${word} from the banned list.`,
    });
  },
  [Subcommand.Remove]: (interaction) => {
    const word = interaction.options.getString("word")?.trim();
    database.remove(word!);

    return updater.message({
      description: `Removed the word ${word} from the banned list.`,
    });
  },
  [Subcommand.Ranking]: function (interaction): BaseMessageOptions {
    const word = interaction.options.getString("word")?.trim();
    const user = interaction.options.getUser("user");

    const result = database.ranking(word, user?.id);
    if (result instanceof Object) {
      return updater.message({
        description: "Ranking",
        field: toRankingList(result),
      });
    }

    return updater.message({
      description: `The user ${user} has said ${word} ${result} times`,
    });
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
