import { editSnipes } from "../utils/snipeStore.js";

export async function editSnipeCommand(message) {
  const data = editSnipes.get(message.channel.id);

  if (!data) {
    await message.reply("❌ No edited message to snipe.");
    return;
  }

  await message.channel.send({
    content:
      `✏️ **Edited Message Sniped**\n` +
      `👤 <@${data.authorId}>\n` +
      `🕒 <t:${Math.floor(data.editedAt / 1000)}:R>\n\n` +
      `**Before:**\n${data.before}\n\n` +
      `**After:**\n${data.after}`,
    allowedMentions: {
      users: [data.authorId],
      roles: [],
      everyone: false,
    },
  });
}
