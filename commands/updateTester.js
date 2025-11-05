import { getConfigCollection, saveUsers, getUsers } from "../config/db.js";

export async function addTester(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to add.");
  const users = await getUsers();
  if (users.testers.includes(id)) return message.reply("⚠️ Already a tester.");

  users.testers.push(id);
  await saveUsers(users);
  await message.reply(`✅ Added <@${id}> as tester.`);
}

export async function removeTester(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to remove.");
  const users = await getUsers();
  if (!users.testers.includes(id)) return message.reply("⚠️ User is not a tester.");

  users.testers = users.testers.filter(u => u !== id);
  await saveUsers(users);
  await message.reply(`✅ Removed <@${id}> from testers.`);
}
