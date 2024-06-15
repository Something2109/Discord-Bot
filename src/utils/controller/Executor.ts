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

/**
 * The executor interface.
 * Contains the basic info the executor need
 * to interact with the command container and client.
 */
interface Executor {
  readonly name: string;
  readonly description: string;

  /**
   * The main execution function of the command.
   * Taking the options from the parameters and execute.
   * @param options The option object to be taken.
   */
  execute(options: OptionExtraction): Promise<string>;
}

abstract class BaseExecutor implements Executor {
  readonly name: string;
  readonly description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  abstract execute(options: OptionExtraction): Promise<string>;
}

/**
 * A simple class of the executor to implement new executor class.
 */
abstract class CommandExecutor extends BaseExecutor {
  options?: ApplicationCommandOptionBase[];

  abstract execute(options: OptionExtraction): Promise<string>;
}

/**
 * A simple class of multicommand executor
 * to implement new subcommand executor class.
 * Add subcommand to it by using the add function.
 */
abstract class SubcommandExecutor<
  Controller extends Executor
> extends BaseExecutor {
  readonly subcommands: {
    [key in string]: Controller;
  };

  constructor(name: string, description: string) {
    super(name, description);
    this.subcommands = {};
  }

  /**
   * The function to add subcommand to the executor.
   * @param controllers The subcommand executor type to add to the executor.
   */
  public add(...controllers: Array<new () => Controller>) {
    controllers.forEach((controller) => {
      const instance = new controller();
      this.subcommands[instance.name] = instance;
    });
  }

  async execute(options: OptionExtraction) {
    const subcommand = options.subcommand as string;
    if (subcommand && this.subcommands[subcommand]) {
      return this.subcommands[subcommand].execute(options);
    }
    return "No subcommand matched";
  }
}

export {
  OptionExtraction,
  Executor,
  BaseExecutor,
  CommandExecutor,
  SubcommandExecutor,
};
