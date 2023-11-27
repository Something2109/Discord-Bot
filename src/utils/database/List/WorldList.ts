import { JsonLoader } from "../JsonLoader";

interface MinecraftWorld {
  name: string;
  value: string;
}

/**
 * Containing the list of world that a guild can use.
 */
class WorldList extends JsonLoader {
  protected SaveName = "world.json";
  public list: MinecraftWorld[];
  protected path: string;

  constructor(path: string) {
    super();
    this.list = [];
    this.path = path;
    this.load();
  }

  add(name: string, folderName: string): string | undefined {
    if (!this.getName(name)) {
      this.list.push({
        name,
        value: folderName,
      });
      this.save();

      return name;
    }
    return undefined;
  }

  getName(path: string) {
    const index = this.list.find((world) => world.value == path);
    return index?.name;
  }

  worldList() {
    return this.list.map((world) => world.value);
  }

  remove(path: string): string | undefined {
    const world = this.list.find((world) => world.value == path);
    if (world) {
      this.list.splice(this.list.indexOf(world), 1)[0];
      this.save();

      return world.name;
    }
    return undefined;
  }
}

export { WorldList };
