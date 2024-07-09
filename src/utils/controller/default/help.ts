import { ConsoleLineInterface } from "../../Console";

const discord = {
  name: "help",
  help: () => `help: Show the command list and their functionalities.`,
  execute: async () => ConsoleLineInterface.help(),
};

export { discord };
