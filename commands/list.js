export async function listUsers(message, users) {
  const guild = message.guild;
  if (!guild) return message.reply("⚠️ Could not fetch guild members.");

  const targetNames = await Promise.all(
    users.targets.map(async (id) => {
      const member = await guild.members.fetch(id).catch(() => null);
      return member ? member.displayName : id;
    })
  );

  const testerNames = await Promise.all(
    users.testers.map(async (id) => {
      const member = await guild.members.fetch(id).catch(() => null);
      return member ? member.displayName : id;
    })
  );

  await message.reply(
    `📝 **Current Users:**\n\n**Targets:** ${targetNames.join(", ") || "None"}\n**Testers:** ${testerNames.join(", ") || "None"}`
  );
}
