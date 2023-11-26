import { Events, Guild } from "discord.js";
import { Database } from "../utils/database/Database";

module.exports = {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    if (Database.add(guild.id)) {
      console.log(
        `[BOT]: Successfully removed ${guild.name} from the database.`
      );
    } else {
      console.log(`[BOT]: Failed to remove ${guild.name} from the database.`);
    }
  },
};
