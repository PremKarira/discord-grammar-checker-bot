import { EmbedBuilder } from "discord.js";

export async function listUsers(message, users, botStatus) {
  const guild = message.guild;
  if (!guild) return message.reply("⚠️ Could not fetch guild members.");

  const MAX_TOTAL = 5500;
  let used = 0;

  function trimToFit(text) {
    const remaining = MAX_TOTAL - used;

    if (remaining <= 0) return "…";

    if (text.length > remaining) {
      used += remaining;
      return text.slice(0, remaining) + "\n...and more";
    }

    used += text.length;
    return text;
  }

  const formatUsers = async (ids = []) => {
    if (!ids.length) return "— None";

    const lines = await Promise.all(
      ids.map(async (id) => {
        const member = await guild.members.fetch(id).catch(() => null);
        const name = member ? member.displayName : "Unknown User";

        return `• <@${id}> ${name} (ID: ${id})`;
      })
    );

    return lines.join("\n");
  };

  // 🔹 Build full raw text (for fallback)
  const rawText = `
=== BOT STATUS ===
Text Commands: ${botStatus.commandEnabled ? "ON" : "OFF"}
Voice State Updates: ${botStatus.voiceStateUpdate ? "ON" : "OFF"}
Message Forwarding: ${botStatus.forwardingEnabled ? "ON" : "OFF"}

=== TESTERS ===
${await formatUsers(users.testers)}

=== TARGETS ===
${await formatUsers(users.targets)}

=== VOICE TARGETS ===
${await formatUsers(users.voiceTargets)}

=== REPLY TARGETS ===
${await formatUsers(users.replyTargets)}
`;

  try {
    const embeds = [];

    // Bot Status
    embeds.push(
      new EmbedBuilder()
        .setTitle("⚙️ Bot Status")
        .setColor(0x5865f2)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setDescription(
          trimToFit(
            `**Text Commands:** ${botStatus.commandEnabled ? "🟢 ON" : "🔴 OFF"}
**Voice State Updates:** ${botStatus.voiceStateUpdate ? "🟢 ON" : "🔴 OFF"}
**Message Forwarding:** ${botStatus.forwardingEnabled ? "🟢 ON" : "🔴 OFF"}`
          )
        )
        .setTimestamp()
    );

    async function pushEmbed(title, color, data) {
      const text = await formatUsers(data);
      embeds.push(
        new EmbedBuilder()
          .setTitle(title)
          .setColor(color)
          .setDescription(trimToFit(text))
      );
    }

    await pushEmbed("🧪 Testers", 0x57f287, users.testers);
    await pushEmbed("🎯 Grammar Targets", 0xed4245, users.targets);
    await pushEmbed("🎙️ Voice Targets", 0xfee75c, users.voiceTargets);
    await pushEmbed("💬 Reply Targets", 0x5865f2, users.replyTargets);

    embeds[embeds.length - 1].setFooter({
      text: "Mentions are displayed without notifying users",
    });

    await message.reply({
      embeds,
      allowedMentions: { repliedUser: false },
    });

  } catch (err) {
    // 🔥 Fallback to TXT file
    const buffer = Buffer.from(rawText, "utf-8");

    await message.reply({
      content: "⚠️ Too much data, sending as file instead.",
      files: [{ attachment: buffer, name: "users.txt" }],
      allowedMentions: { repliedUser: false },
    });
  }
}