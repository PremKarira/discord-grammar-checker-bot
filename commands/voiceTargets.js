import { saveUsers, getUsers } from "../config/db.js";

export async function addVoiceTarget(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to add.");
  const users = await getUsers();

  if (!users.voiceTargets) users.voiceTargets = [];

  if (users.voiceTargets.includes(id))
    return message.reply("⚠️ Already a voice target.");

  users.voiceTargets.push(id);
  await saveUsers(users);
  await message.reply(`🎙️✅ Added <@${id}> as a voice target.`);
}

export async function removeVoiceTarget(message, id) {
  if (!id) return message.reply("⚠️ Provide a user ID to remove.");
  const users = await getUsers();

  if (!users.voiceTargets || !users.voiceTargets.includes(id))
    return message.reply("⚠️ User is not a voice target.");

  users.voiceTargets = users.voiceTargets.filter((u) => u !== id);
  await saveUsers(users);
  await message.reply(`🎙️✅ Removed <@${id}> from voice targets.`);
}
