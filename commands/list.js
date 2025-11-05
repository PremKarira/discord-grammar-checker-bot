export async function listUsers(message, users) {
  const targetMentions = users.targets.map(id => `<@${id}>`).join(", ") || "None";
  const testerMentions = users.testers.map(id => `<@${id}>`).join(", ") || "None";

  await message.reply(
    `📝 **Current Users:**\n\n**Targets:** ${targetMentions}\n**Testers:** ${testerMentions}`
  );
}
