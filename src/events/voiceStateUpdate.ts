import { Events } from "discord.js";
import { VoiceState } from "discord.js";
import { CustomClient } from "../utils/Client";

module.exports = {
  name: Events.VoiceStateUpdate,
  execute(oldState: VoiceState, newState: VoiceState) {
    const members = oldState.channel?.members;
    const client = oldState.client as CustomClient;

    if (members?.size === 1 && members.has(process.env.CLIENT_ID!)) {
      client.connection.leave();
    }
  },
};
