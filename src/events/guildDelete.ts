import { Events, Guild } from "discord.js";
import { Database } from "../utils/database/Database";

module.exports = {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    Database.remove(guild.id);
  },
};
