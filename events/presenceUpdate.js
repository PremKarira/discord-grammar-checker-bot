import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export async function handlePresenceUpdate(client, oldPresence, newPresence) {
  try {
    const user = newPresence.user;
    const channel = await client.channels.fetch("875427164076531743");

    const oldActivity = oldPresence?.activities?.[0]?.details;
    const newActivity = newPresence?.activities?.[0]?.details;

    if (!newActivity || oldActivity === newActivity) return;

    const deleteButton = new ButtonBuilder()
      .setCustomId("delete_message")
      .setLabel("🗑️ Delete")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(deleteButton);

    await channel.send({
      content: `🟣 **${user.tag}** updated custom status → \`${newActivity}\``,
      components: [row],
    });

    // console.log(`✅ Sent custom status update for ${user.tag}: ${newActivity}`);
  } catch (err) {
    console.error("Presence Handler Error:", err);
  }
}
