import { getVoiceTargets } from "../config/db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const muteTimers = new Map();

export async function handleVoiceStateUpdate(oldState, newState, isBotActive) {
  const GUILD_ID = "875427163598368779";
  const TEXT_CHANNEL_ID = "875427164076531743";

  try {
    if (newState.guild.id !== GUILD_ID) return;
    if (newState.member.user.bot) return;

    const member = newState.member;

      console.log(newState.selfMute && newState.selfDeaf);
      // ===============================
      // ✅ AUTO MOVE TO AFK IF MUTED+DEAF 1 MIN
      // ===============================
      if (newState.selfMute && newState.selfDeaf) {

  if (!muteTimers.has(member.id)) {
    const timer = setTimeout(async () => {
      try {
        const updatedState = member.voice;

        if (updatedState.selfMute && updatedState.selfDeaf) {

          const AFK_CHANNEL_ID = "1444000409483087903";
          const afkChannel = member.guild.channels.cache.get(AFK_CHANNEL_ID);

          if (afkChannel && member.voice.channelId !== AFK_CHANNEL_ID) {
            await member.voice.setChannel(afkChannel);
            console.log(`Moved ${member.user.tag} to AFK`);
          }
        }

      } catch (err) {
        console.error("AFK move error:", err);
      } finally {
        muteTimers.delete(member.id);
      }
    }, 60 * 1000);

    muteTimers.set(member.id, timer);
  }

} else {
  // Cancel timer if they undeafen/unmute
  if (muteTimers.has(member.id)) {
    clearTimeout(muteTimers.get(member.id));
    muteTimers.delete(member.id);
  }
}

    

    // ===============================
    // ✅ OLD VOICE JOIN LOGIC
    // ===============================
    if (!isBotActive.value) return;
    const voiceTargets = await getVoiceTargets();

    if (
      voiceTargets.includes(member.id) &&
      !oldState.channelId &&
      newState.channelId
    ) {
      const channel = await newState.guild.channels.fetch(TEXT_CHANNEL_ID);

      if (channel) {
        const deleteButton = new ButtonBuilder()
          .setCustomId("delete_message")
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(deleteButton);

        await channel.send({
          content: `🗣️ ${
            member.displayName || "Someone"
          } has joined the voice chat...`,
          components: [row],
        });
      }
    }
  } catch (error) {
    console.error("❌ Error in handleVoiceStateUpdate:", error);
  }
}
