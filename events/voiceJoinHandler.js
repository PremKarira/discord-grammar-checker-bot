import { getVoiceTargets } from "../config/db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
export async function handleVoiceStateUpdate(oldState, newState) {
  const GUILD_ID = "875427163598368779";
  const TEXT_CHANNEL_ID = "875427164076531743";

  try {
    if (newState.guild.id !== GUILD_ID) return;

    const voiceTargets = await getVoiceTargets();

    if (voiceTargets.includes(newState.member.id)) {
      const channel = await newState.guild.channels.fetch(TEXT_CHANNEL_ID);
      if (channel) {
        const deleteButton = new ButtonBuilder()
          .setCustomId("delete_message")
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(deleteButton);

        const msg = await channel.send({
          content: `🗣️ ${
            newState.member.displayName || "Someone"
          } has joined the voice chat...`,
          components: [row],
        });
        // setTimeout(() => {
        //   msg.delete().catch(() => {});
        // }, 20000);
      }
    }
  } catch (error) {
    console.error("❌ Error in handleVoiceStateUpdate:", error);
  }
}
