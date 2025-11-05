import { getVoiceTargets } from "../config/db.js";

export async function handleVoiceStateUpdate(oldState, newState) {
  const GUILD_ID = "875427163598368779";
  const TEXT_CHANNEL_ID = "875427164076531743";

  try {
    if (newState.guild.id !== GUILD_ID) return;

    const voiceTargets = await getVoiceTargets();

    // Trigger if any stored voice target joins a VC
    if (voiceTargets.includes(newState.member.id)) {
      const channel = await newState.guild.channels.fetch(TEXT_CHANNEL_ID);
      if (channel) {
        await channel.send(`🗣️ ${newState.member.displayName || "Someone"} has joined the voice chat.`);
      }
    }
  } catch (error) {
    console.error("❌ Error in handleVoiceStateUpdate:", error);
  }
}
