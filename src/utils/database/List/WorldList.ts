import { JsonLoader } from "../JsonLoader";
import path from "node:path";

interface MinecraftWorld {
  name: string;
  value: string;
}

/**
 * Containing the list of world that a guild can use.
 */
class WorldList extends JsonLoader<MinecraftWorld> {
  constructor(filePath: string) {
    super(path.join(filePath, "world.json"));
  }

  /**
   * Add a world data to the list.
   * @param name The display name of the world.
   * @param folderName The folder name of the world for the server to access.
   * @returns The display name if successful else undefined.
   */
  add(name: string, folderName: string): string | undefined {
    if (!this.get(folderName)) {
      this.list.push({
        name,
        value: folderName,
      });
      this.save();

      return name;
    }
    return undefined;
  }

  /**
   * Get the display name from the folder name.
   * @param folderName The folder name.
   * @returns The display name if found else undefined.
   */
  get(folderName?: string | null) {
    if (folderName) {
      const index = this.list.find((world) => world.value == folderName);
      return index;
    }
    return undefined;
  }

  get worldList() {
    return this.list;
  }

  /**
   * Remove a world from the list with the given display name.
   * @param name The display name.
   * @returns The display name if success else undefined.
   */
  remove(name: string): string | undefined {
    const world = this.list.find((world) => world.value == name);
    if (world) {
      this.list.splice(this.list.indexOf(world), 1)[0];
      this.save();

      return world.name;
    }
    return undefined;
  }
}

export { WorldList };
