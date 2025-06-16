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
  | User
  | null;

type OptionExtraction = {
  [key in string]?: OptionType;
};

/**
 * The executor interface.
 * Contains the basic info the executor need
 * to interact with the command container and client.
 */
interface Executor<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> {
  readonly name: string;
  readonly description: string;

  /**
   * The main execution function of the command.
   * Taking the options from the parameters and execute.
   * @param options The option object to be taken.
   */
  execute(options: Options): Promise<Result>;
}

abstract class BaseExecutor<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> implements Executor<Options, Result>
{
  readonly name: string;
  readonly description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  abstract execute(options: Options): Promise<Result>;
}

export { OptionExtraction, Executor, BaseExecutor };
