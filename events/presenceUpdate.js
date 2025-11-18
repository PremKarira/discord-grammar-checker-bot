import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export async function handlePresenceUpdate(client, oldPresence, newPresence) {
  try {
    const user = newPresence.user;
    if (user.bot) return;

    const channel = await client.channels.fetch("875427164076531743");

    const oldActivity = oldPresence?.activities?.find(a => a.state || a.details);
    const newActivity = newPresence?.activities?.find(a => a.state || a.details);

    const oldText = oldActivity?.details || oldActivity?.state || null;
    const newText = newActivity?.details || newActivity?.state || null;

    if (oldText === newText) return;

    if (!newText) return;

    const deleteButton = new ButtonBuilder()
      .setCustomId("delete_message")
      .setLabel("🗑️ Delete")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(deleteButton);

    await channel.send({
      content: `🟣 **${user.tag}** updated custom status → \`${newText}\``,
      components: [row],
    });

  } catch (err) {
    console.error("Presence Handler Error:", err);
  }
}
