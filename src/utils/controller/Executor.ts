import {
  ApplicationCommandOptionBase,
  Attachment,
  Channel,
  Role,
  User,
} from "discord.js";

type OptionType =
  | Attachment
  | boolean
  | Channel
  | number
  | Role
  | string
  | User;

type OptionExtraction = {
  [key in string]?: OptionType;
};

interface Executor {
  readonly name: string;
  readonly description: string;
  options?: ApplicationCommandOptionBase[];
  execute(options: OptionExtraction): Promise<string>;
}

abstract class CommandExecutor implements Executor {
  readonly name: string;
  readonly description: string;
  options?: ApplicationCommandOptionBase[];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  abstract execute(options: OptionExtraction): Promise<string>;
}

abstract class SubcommandExecutor<
  Subcommand extends string,
  Controller extends Executor
> implements Executor
{
  readonly name: string;
  readonly description: string;
  abstract readonly subcommands: {
    [key in Subcommand]: Controller;
  };

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  async execute(options: OptionExtraction) {
    if (options.subcommand) {
      return Object.keys(this.subcommands).includes(
        options.subcommand as Subcommand
      )
        ? this.subcommands[options.subcommand as Subcommand].execute(options)
        : "No subcommand matched";
    }
    return "No subcommand provided";
  }
}

export { OptionExtraction, Executor, CommandExecutor, SubcommandExecutor };
