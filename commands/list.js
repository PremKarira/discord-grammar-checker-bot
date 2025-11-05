export async function listUsers(message, users) {
  const guild = message.guild;
  if (!guild) return message.reply("⚠️ Could not fetch guild members.");

  // Fetch all members to resolve usernames
  await guild.members.fetch();

  const targetNames =
    users.targets
      .map(id => guild.members.cache.get(id)?.displayName || id)
      .join(", ") || "None";

  const testerNames =
    users.testers
      .map(id => guild.members.cache.get(id)?.displayName || id)
      .join(", ") || "None";

  await message.reply(
    `📝 **Current Users:**\n\n**Targets:** ${targetNames}\n**Testers:** ${testerNames}`
  );
}
