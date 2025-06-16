import { CommandLoader } from "../Loader";

const discord = {
  name: "help",
  help: () => `help: Show the command list and their functionalities.`,
  execute: async () => {
    let result: string = "Available commands:\n";
    result = result.concat(
      CommandLoader.cli.map((value) => value.help()).join("\n")
    );
    return result;
  },
};

export { discord };
