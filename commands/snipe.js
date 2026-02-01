import { snipes } from "../utils/snipeStore.js";

export async function snipeCommand(message, args = []) {
  const list = snipes.get(message.channel.id);

  if (!list || list.length === 0) {
    await message.reply("❌ Nothing to snipe here.");
    return;
  }

  // !snipe clear
  if (args[0] === "clear") {
    snipes.delete(message.channel.id);
    await message.reply("🧹 Snipes cleared for this channel.");
    return;
  }

  // !snipe last 5
  const index = args[0] ? parseInt(args[0], 10) - 1 : 0;
  const snipe = list[index];

  if (!snipe) {
    await message.reply("❌ Invalid snipe index.");
    return;
  }

  let msg =
    `🎯 **Sniped Message (${index + 1})**\n` +
    `👤 <@${snipe.authorId}>\n` +
    `🕒 <t:${Math.floor(snipe.createdAt / 1000)}:R>\n\n` +
    snipe.content;

  if (snipe.attachments.length) {
    msg += "\n\n📎 **Attachments:**\n" + snipe.attachments.join("\n");
  }

  await message.channel.send({
    content: msg,
    allowedMentions: {
      users: [snipe.authorId],
      roles: [],
      everyone: false,
    },
  });
}
