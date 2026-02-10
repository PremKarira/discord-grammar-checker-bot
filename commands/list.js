import { EmbedBuilder } from "discord.js";

export async function listUsers(message, users) {
  const guild = message.guild;
  if (!guild) return message.reply("⚠️ Could not fetch guild members.");

  const formatUsers = async (ids = []) => {
    if (!ids.length) return "— None";

    const lines = await Promise.all(
      ids.map(async (id) => {
        const member = await guild.members.fetch(id).catch(() => null);
        const name = member ? member.displayName : "Unknown User";

        const silentMention = `<@${id}>`;

        return `• ${silentMention} **${name}**\n  \`ID: ${id}\``;
      })
    );

    return lines.join("\n");
  };

  const embed = new EmbedBuilder()
    .setTitle("📋 User Configuration Overview")
    .setColor(0x5865F2)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      {
        name: "🧪 Testers",
        value: await formatUsers(users.testers),
        inline: false,
      },
      {
        name: "🎯 Grammar Targets",
        value: await formatUsers(users.targets),
        inline: false,
      },
      {
        name: "🎙️ Voice Targets",
        value: await formatUsers(users.voiceTargets),
        inline: false,
      },
      {
        name: "💬 Reply Targets",
        value: await formatUsers(users.replyTargets),
        inline: false,
      }
    )
    .setFooter({
      text: "Mentions are displayed without notifying users",
    })
    .setTimestamp();

  await message.reply({ embeds: [embed] , allowedMentions: { repliedUser: false }});
}
