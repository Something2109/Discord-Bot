import fs from "node:fs";
import path from "node:path";
import { Collection, REST, Routes } from "discord.js";
import { CliController, CliSubcommandController } from "./Console";
import { DiscordController, DiscordSubcommandController } from "./Discord";
import { Logger } from "../Logger";
import { ConsoleLineInterface } from "../Console";
import { BaseExecutor, Executor } from "./Executor";

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
        const { Discord, Cli } = this.readCommandFile(
          path.join(folderPath, file)
        );

        Discord.forEach((command) => {
          this.discordCommands.set(command.name, command);
        });
        Cli.forEach((command) => {
          ConsoleLineInterface.commands.set(command.name, command);
        });
      } else if (fs.lstatSync(path.join(folderPath, file)).isDirectory()) {
        const { Discord, Cli } = this.readCommandFolder(
          path.join(folderPath, file)
        );
        const name = file.replace(".js", "");

        if (Discord.length > 0) {
          const controller = new DiscordSubcommandController(name, name);

          controller.add(...Discord);

          this.discordCommands.set(name, controller);
        }

        if (Cli.length > 0) {
          const controller = new CliSubcommandController(name, name);

          controller.add(...Cli);

          ConsoleLineInterface.commands.set(name, controller);
        }
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
    const result: { Discord: DiscordController[]; Cli: CliController[] } = {
      Discord: [],
      Cli: [],
    };

    const module = this.readFile(file);

    if (module) {
      Object.values(module).forEach((object: any) => {
        const controller = this.create(object);
        if (controller) {
          if ("data" in controller && this.isDiscordController(controller)) {
            result.Discord.push(controller);
          } else if ("help" in controller && this.isCliController(controller)) {
            result.Cli.push(controller);
          }
        }
      });
    }

    return result;
  }

  /**
   * Read and create the command from a folder.
   * @param folder The folder path.
   */
  private static readCommandFolder(folder: string) {
    const result: { Discord: DiscordController[]; Cli: CliController[] } = {
      Discord: [],
      Cli: [],
    };

    fs.readdirSync(folder)
      .filter((file) => file.endsWith(".js") && file != "template.js")
      .forEach((file) => {
        const subcommandPath = path.join(folder, file);
        const { Discord, Cli } = this.readCommandFile(subcommandPath);

        result.Discord.push(...Discord);
        result.Cli.push(...Cli);
      });

    return result;
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
  private static isDiscordController(object: any): object is DiscordController {
    if (!(object.name && "data" in object && "execute" in object)) {
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
  private static isCliController(object: any): object is CliController {
    if (!(object.name && "help" in object && "execute" in object)) {
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
