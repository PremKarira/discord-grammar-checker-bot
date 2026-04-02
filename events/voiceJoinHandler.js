import { getVoiceTargets } from "../config/db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const muteTimers = new Map();

export async function handleVoiceStateUpdate(oldState, newState, isBotActive) {
  const GUILD_ID = "875427163598368779";
  const TEXT_CHANNEL_ID = "875427164076531743";
  const AFK_CHANNEL_ID = "1444000409483087903";

  try {
    if (newState.guild.id !== GUILD_ID) return;
    if (newState.member.user.bot) return;

    const member = newState.member;

    if (
      newState.selfMute &&
      newState.selfDeaf &&
      (!newState.channelId || newState.channelId !== AFK_CHANNEL_ID)
      && newState.user.id !== "428902961847205899"
    ) {
      if (!muteTimers.has(member.id)) {
        const userId = member.id;

        const timer = setTimeout(async () => {
          try {
            const guild = newState.client.guilds.cache.get(GUILD_ID);
            if (!guild) return;

            const freshMember = await guild.members
              .fetch(userId)
              .catch(() => null);
            if (!freshMember || !freshMember.voice.channelId) return;
            if (freshMember.voice.channelId === AFK_CHANNEL_ID) return;

            if (freshMember.voice.selfMute && freshMember.voice.selfDeaf) {
              await freshMember.voice
                .setChannel(AFK_CHANNEL_ID)
                .catch(() => {});
            }
          } finally {
            muteTimers.delete(userId);
          }
        }, 60 * 1000);

        muteTimers.set(member.id, timer);
      }
    } else {
      if (muteTimers.has(member.id)) {
        clearTimeout(muteTimers.get(member.id));
        muteTimers.delete(member.id);
      }
    }

    // if (!isBotActive.value) return;

    const voiceTargets = await getVoiceTargets();

    if (
      voiceTargets.includes(member.id) &&
      !oldState.channelId &&
      newState.channelId
    ) {
      const channel = await newState.guild.channels
        .fetch(TEXT_CHANNEL_ID)
        .catch(() => null);

      if (channel) {
        const deleteButton = new ButtonBuilder()
          .setCustomId("delete_message")
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(deleteButton);

        await channel.send({
          content: `🗣️ ${member.displayName || "Someone"} has joined the voice chat...`,
          components: [row],
        });
      }
    }
  } catch (error) {
    console.error("❌ Error in handleVoiceStateUpdate:", error);
  }
}
