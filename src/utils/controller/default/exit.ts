import { ConsoleLineInterface } from "../../Console";

const console = {
  name: "exit",
  help: () => `exit: Exit the command line and terminate the bot.`,
  execute: async () => {
    setTimeout(() => {
      ConsoleLineInterface.exit();
    }, 1000);
    return "Exitting the program";
  },
};

export { console };
