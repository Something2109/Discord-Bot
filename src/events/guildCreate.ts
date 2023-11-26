import { Events, Guild } from "discord.js";
import { Database } from "../utils/database/Database";

module.exports = {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    if (Database.addGuild(guild.id)) {
      console.log(`[BOT]: Successfully added ${guild.name} to the database.`);
    } else {
      console.log(`[BOT]: Failed to add ${guild.name} to the database.`);
    }
  },
};