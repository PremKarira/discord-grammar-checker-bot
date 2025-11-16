import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export async function handlePresenceUpdate(client, oldPresence, newPresence) {
  try {
    const user = newPresence.user;
    if (user.bot) return;
    const channel = await client.channels.fetch("875427164076531743");

    const oldCustom = oldPresence?.activities?.find(a => a.type === 4);
    const newCustom = newPresence?.activities?.find(a => a.type === 4);

    const oldText = oldCustom?.state || null;
    const newText = newCustom?.state || null;

    if (oldText === newText) return;

    if (!newText) return;

    const deleteButton = new ButtonBuilder()
      .setCustomId("delete_message")
      .setLabel("🗑️ Delete")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(deleteButton);

    await channel.send({
      content: `🟣 **${user.tag}** uupdated custom status → \`${newText}\``,
      components: [row],
    });

  } catch (err) {
    console.error("Presence Handler Error:", err);
  }
}
