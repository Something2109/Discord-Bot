interface CliController {
  /**
   * The name of the command to identify it from other command.
   */
  name: string;

  /**
   * Retrieve the command information for the guild.
   * @returns The command info in the form of string to display.
   */
  help: () => string;

  /**
   * Execute the command based on the interaction.
   * Called when there's an event triggered.
   * @param interaction The interaction to execute.
   */
  execute: (input: string[]) => Promise<string>;
}

export { CliController };
