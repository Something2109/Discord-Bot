import fs from "node:fs";
import path from "node:path";
import { Collection, REST, Routes } from "discord.js";
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
  private static clientId: string;

  private static logger = new Logger("CML");
  private static commandPaths: Set<string> = new Set([
    path.join(__dirname, "default"),
  ]);

  static get discord() {
    if (!this.discordCommands) {
      this.initiate();
    }
    return this.discordCommands;
  }

  /**
   * Create a new instance of command list and remove the old one if created.
   */
  static initiate() {
    if (!this.clientId) {
      if (!process.env.CLIENT_ID) {
        throw new Error("The client id is not specified.");
      }
      this.clientId = process.env.CLIENT_ID;
    }

    this.discordCommands = new Collection();
    ConsoleLineInterface.commands = new Collection<string, CliController>();

    this.logger.log("Initiating commands");

    this.commandPaths.forEach((commandPath) => {
      this.add(commandPath);
    });
  }

  /**
   * Add a command path to the path list.
   * @param folderPath The path to load.
   */
  static use(folderPath: string) {
    this.commandPaths.add(folderPath);
  }

  /**
   * Add the command by reading the folder path.
   * @param folderPath The folder path of the command.
   */
  private static add(folderPath: string) {
    fs.readdirSync(folderPath).forEach((file: string) => {
      if (file.endsWith(".js")) {
        this.readCommandFile(path.join(folderPath, file));
      } else if (fs.lstatSync(path.join(folderPath, file)).isDirectory()) {
        this.readCommandFolder(path.join(folderPath, file));
      }
    });
  }

  /**
   * Refresh commands for a specified guild.
   * @param guildId The guild id to refresh.
   */
  static async updateCommands(guildId: string) {
    try {
      const body = this.discord.map((command) =>
        command.data(guildId).toJSON()
      );

      const rest = new REST().setToken(process.env.TOKEN!);
      const route = Routes.applicationGuildCommands(this.clientId, guildId);

      // The put method is used to fully refresh all commands in the guild with the current set
      await rest.put(route, { body });

      this.logger.log(
        `Successfully reloaded application (/) commands to server ${guildId}`
      );
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      this.logger.error(error);
    }
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
      this.logger.log(`Including the commands in path ${filePath}.`);
      return require(filePath);
    }
    this.logger.log(`Cannot find the module in ${filePath}`);
    return undefined;
  }
}

export { ControllerLoader as CommandLoader };
