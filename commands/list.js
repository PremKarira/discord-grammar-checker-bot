export async function listUsers(message, users) {
  const guild = message.guild;
  if (!guild) return message.reply("⚠️ Could not fetch guild members.");

  const resolveNames = async (ids) => {
    return Promise.all(
      ids.map(async (id) => {
        const member = await guild.members.fetch(id).catch(() => null);
        return member ? member.displayName : id;
      }),
    );
  };

  const targetNames = await resolveNames(users.targets);
  const testerNames = await resolveNames(users.testers);
  const voiceTargetNames = await resolveNames(users.voiceTargets || []);
  const replyTargetNames = await resolveNames(users.replyTargets || []);

  await message.reply(
    `📝 **Current Users:**\n\n` +
      `🎯 **Targets:** ${targetNames.join(", ") || "None"}\n` +
      `🧪 **Testers:** ${testerNames.join(", ") || "None"}\n` +
      `🎙️ **Voice Targets:** ${voiceTargetNames.join(", ") || "None"}\n` +
      `🎙️ **Reply Targets:** ${replyTargetNames.join(", ") || "None"}`,
  );
}
