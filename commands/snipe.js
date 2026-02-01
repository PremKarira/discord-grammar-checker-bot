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

  // !snipe all
if (args[0] === "all") {
  let msg = `🎯 **All Sniped Messages (${list.length})**\n\n`;
  list.forEach((snipe, i) => {
    msg += `**#${i + 1}** 👤 <@${snipe.authorId}> 🕒 <t:${Math.floor(snipe.createdAt / 1000)}:R>\n${snipe.content}\n`;
    if (snipe.attachments.length) {
      msg += "📎 **Attachments:**\n" + snipe.attachments.join("\n") + "\n";
    }
    msg += "\n";
  });

  // Deduplicate user IDs for allowedMentions
  const uniqueUsers = [...new Set(list.map(s => s.authorId))];

  await message.channel.send({
    content: msg,
    allowedMentions: { users: uniqueUsers, roles: [], everyone: false },
  });
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
