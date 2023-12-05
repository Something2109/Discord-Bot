import { Events } from "discord.js";
import { VoiceState } from "discord.js";
import { DefaultConnection } from "../utils/music/Connection";

module.exports = {
  name: Events.VoiceStateUpdate,
  execute(oldState: VoiceState, newState: VoiceState) {
    const members = newState.channel?.members;
    if (!members?.size) {
      new DefaultConnection().leave();
    }
  },
};
