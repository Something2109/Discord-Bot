import fs from "node:fs";
import path from "node:path";
import { Collection } from "discord.js";
import {
  BaseCliController,
  CliController,
  CliSubcommandController,
} from "./Console";
import { DiscordController, DiscordSubcommandController } from "./Discord";
import { Logger } from "../Logger";
import { ConsoleLineInterface } from "../Console";
import {
  BaseExecutor,
  CommandExecutor,
  Executor,
  SubcommandExecutor,
} from "./Executor";

class ControllerLoader {
  private static discordCommands: Collection<string, DiscordController>;
  private static logger = new Logger("CML");

  static get discord() {
    if (!this.discordCommands) {
      this.initiate();
    }
    return this.discordCommands;
  }

  static initiate() {
    this.discordCommands = new Collection();
    ConsoleLineInterface.commands = this.initiateCliCommands();

    this.logger.log("Initiating commands");
    const rootPath = path.dirname(path.dirname(path.dirname(__filename)));
    const commandsPath = path.join(rootPath, "commands");
    fs.readdirSync(commandsPath).forEach((file: string) => {
      if (file.endsWith(".js")) {
        this.readCommandFile(path.join(commandsPath, file));
      } else if (fs.lstatSync(path.join(commandsPath, file)).isDirectory()) {
        this.readCommandFolder(path.join(commandsPath, file));
      }
    });
  }

  /**
   * Create the command collection and load the default commands
   * for the console line interface.
   * @returns The command collection object.
   */
  private static initiateCliCommands(): Collection<string, CliController> {
    const commands = new Collection<string, CliController>();
    commands.set("help", {
      name: "help",
      help: () => `help: Show the command list and their functionalities.`,
      execute: async () => ConsoleLineInterface.help(),
    });
    commands.set("refresh", {
      name: "refresh",
      help: () =>
        `refresh: Refresh the command list and their functionalities.`,
      execute: async () => {
        ControllerLoader.initiate();
        return "Finish reloading commands";
      },
    });
    commands.set("exit", {
      name: "exit",
      help: () => `exit: Exit the command line and terminate the bot.`,
      execute: async () => {
        setTimeout(() => {
          ConsoleLineInterface.exit();
        }, 1000);
        return "Exitting the program";
      },
    });
    return commands;
  }

  /**
   * Read and create command from a file.
   * @param file The file path.
   */
  private static readCommandFile(file: string) {
    const module = this.readFile(file);

    if (module) {
      Object.values(module).forEach((object: any) => {
        const controller = this.create(object);
        if (controller) {
          if ("data" in controller && this.isDiscordController(controller)) {
            this.discordCommands.set(controller.name, controller);
          } else if ("help" in controller && this.isCliController(controller)) {
            ConsoleLineInterface.commands.set(controller.name, controller);
          }
        }
      });
    }
  }

  /**
   * Read and create the command from a folder.
   * @param folder The folder path.
   */
  private static readCommandFolder(folder: string) {
    const { Executor, Controller, DiscordController, CliController } =
      this.loadTemplate(folder);

    const controller = this.create(Controller);

    if (controller && controller instanceof SubcommandExecutor) {
      const discord = this.create(DiscordController, controller);
      if (this.isDiscordController(discord)) {
        this.discordCommands.set(discord.name, discord);
      }

      const cli = this.create(CliController, controller);
      if (this.isCliController(cli)) {
        ConsoleLineInterface.commands.set(cli.name, cli);
      }
    } else {
      this.logger.log(
        `[WARNING] Cannot create subcommand controller from ${controller.name}`
      );
    }

    fs.readdirSync(folder)
      .filter((file) => file.endsWith(".js") && file != "template.js")
      .forEach((file) => {
        const subcommandPath = path.join(folder, file);
        const fileObject = this.readSubcommandFile(subcommandPath, Executor);
        controller.add(...fileObject);
      });
  }

  /**
   * Read the subcommand file from the path.
   * Can take the Executor parameter to specify the specific executors to take.
   * @param filePath The file path to read.
   * @param Executor The executor type to specify the executors.
   * @returns The executor array to load.
   */
  private static readSubcommandFile(
    filePath: string,
    Executor?: typeof BaseExecutor
  ): Executor[] {
    const module = this.readFile(filePath);
    const result: Executor[] = [];

    if (module) {
      Object.values(module).forEach((subcommand: any) => {
        const subexecutor = this.create(subcommand);
        if (!subexecutor) return;

        if (this.isExecutor(subexecutor, Executor)) {
          result.push(subexecutor);
        }
      });
    }

    return result;
  }

  /**
   * Load the template class from the template file.
   * If none specified, function will load the default class from the controller.
   * @param folderPath The subcommand folder path.
   * @returns The template classes.
   */
  private static loadTemplate(folderPath: string) {
    let Executor: typeof CommandExecutor | undefined = undefined;
    let Controller = SubcommandExecutor;
    let DiscordController = DiscordSubcommandController;
    let CliController = CliSubcommandController;

    const templatePath = path.join(folderPath, "template.js");
    const module = this.readFile(templatePath);
    if (module) {
      Object.values(module).forEach((object: any) => {
        if (object.prototype instanceof SubcommandExecutor) {
          Controller = object;
        } else if (object.prototype instanceof CommandExecutor) {
          Executor = object;
        } else if (object.prototype instanceof DiscordSubcommandController) {
          DiscordController = object;
        } else if (object.prototype instanceof CliController) {
          CliController = object;
        }
      });
    }

    return { Executor, Controller, DiscordController, CliController };
  }

  /**
   * The create object function.
   * If the object parameter is a class,
   * the function creates a new object of that and return.
   * Else the function will return the initial object.
   * @param object The input object to create
   * @param options The optional parameter the constructor will take.
   * @returns The initial object or a new object made from the input class.
   */
  private static create(object: any, ...options: any[]) {
    try {
      if (object && object.prototype) {
        object = new object(...options);
      }
    } catch (error) {
      this.logger.error(error);
    }
    return object;
  }

  /**
   * Check if the object is an executor instance.
   * Can take the Executor parameter to specify the specific executor to take.
   * @param object The object to check.
   * @param Executor The executor type to check.
   * @returns true if correct else false
   */
  private static isExecutor(
    object: any,
    Executor?: typeof BaseExecutor
  ): object is Executor {
    if (Executor) {
      if (!(object instanceof Executor)) {
        this.logger.log(
          `[WARNING] The executor is not the extension of the class ${Executor.name}`
        );
        return false;
      }
    } else if (
      !(object.name && "description" in object && "execute" in object)
    ) {
      this.logger.log(
        `[WARNING] The ${object} is wrongly implemented the interface Executor`
      );
      return false;
    }
    return true;
  }

  /**
   * Check if the object is a discord controller instance.
   * Can take the Controller parameter to specify the specific controller to take.
   * @param object The object to check.
   * @param Controller The controller type to check.
   * @returns true if correct else false
   */
  private static isDiscordController(
    object: any,
    Controller?: typeof BaseExecutor
  ): object is DiscordController {
    if (Controller) {
      if (!(object instanceof Controller)) {
        this.logger.log(
          `[WARNING] The executor is not the extension of the class ${Controller.name}`
        );
        return false;
      }
    } else if (!(object.name && "data" in object && "execute" in object)) {
      this.logger.log(
        `[WARNING] The ${object} wrongly implements the discord command interface.`
      );
      return false;
    }
    return true;
  }

  /**
   * Check if the object is a console controller instance.
   * Can take the Controller parameter to specify the specific controller to take.
   * @param object The object to check.
   * @param Controller The controller type to check.
   * @returns true if correct else false
   */
  private static isCliController(
    object: any,
    Controller?: typeof BaseCliController
  ): object is CliController {
    if (Controller) {
      if (!(object instanceof Controller)) {
        this.logger.log(
          `[WARNING] The executor is not the extension of the class ${Controller.name}`
        );
        return false;
      }
    } else if (!(object.name && "help" in object && "execute" in object)) {
      this.logger.log(
        `[WARNING] The ${object} wrongly implements the console command interface.`
      );
      return false;
    }
    return true;
  }

  /**
   * Read the file from the input file path.
   * @param filePath The file path.
   * @returns The object from the file path.
   */
  private static readFile(filePath: string): Object | undefined {
    if (fs.existsSync(filePath) && filePath.endsWith(".js")) {
      this.logger.log(`Read ${filePath}.`);
      return require(filePath);
    }
    this.logger.log(`Cannot find the module in ${filePath}`);
    return undefined;
  }
}

export { ControllerLoader as CommandLoader };
