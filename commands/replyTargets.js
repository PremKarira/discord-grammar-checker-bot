import { saveUsers, getUsers } from "../config/db.js";

export async function addReplyTarget(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to add.");
  const users = await getUsers();

  if (!users.replyTargets) users.replyTargets = [];

  if (users.replyTargets.includes(id))
    return message.reply("⚠️ Already a reply target.");

  users.replyTargets.push(id);
  await saveUsers(users);
  await message.reply(`🎙️✅ Added <@${id}> as a reply target.`);
}

export async function removeReplyTarget(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to remove.");
  const users = await getUsers();

  if (!users.replyTargets || !users.replyTargets.includes(id))
    return message.reply("⚠️ User is not a reply target.");

  users.replyTargets = users.replyTargets.filter((u) => u !== id);
  await saveUsers(users);
  await message.reply(`🎙️✅ Removed <@${id}> from reply targets.`);
}
