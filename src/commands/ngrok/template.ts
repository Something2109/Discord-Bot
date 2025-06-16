import { Updater } from "../../utils/Updater";
import { OptionExtraction } from "../../utils/controller/Executor";
import { DiscordCommandController } from "../../utils/controller/Discord";

class DiscordNgrokController<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> extends DiscordCommandController<Options, Result> {
  readonly updater: Updater = new Updater("Ngrok");
}

export { DiscordNgrokController };
