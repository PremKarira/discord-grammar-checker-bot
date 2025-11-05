import { saveUsers, getUsers } from "../config/db.js";

export async function addTarget(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to add.");
  const users = await getUsers();
  if (users.targets.includes(id)) return message.reply("⚠️ Already a target.");

  users.targets.push(id);
  await saveUsers(users);
  await message.reply(`✅ Added <@${id}> as target.`);
}

export async function removeTarget(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to remove.");
  const users = await getUsers();
  if (!users.targets.includes(id)) return message.reply("⚠️ User is not a target.");

  users.targets = users.targets.filter(u => u !== id);
  await saveUsers(users);
  await message.reply(`✅ Removed <@${id}> from targets.`);
}
