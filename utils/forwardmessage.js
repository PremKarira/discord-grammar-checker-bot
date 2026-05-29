import { saveBotStatus } from "../config/db.js";
import { EmbedBuilder } from "discord.js";

export async function forwardMessage(client, message, PREFIX, botStatus) {
  if (message.author.id === process.env.OWNER_ID) {
    if (message.content === `${PREFIX}f0`) {
      botStatus.forwardingEnabled = !botStatus.forwardingEnabled;

      await saveBotStatus(botStatus);

      return message.reply(
        botStatus.forwardingEnabled
          ? "✅ Message forwarding ENABLED"
          : "❌ Message forwarding DISABLED",
      );
    }
  }

  if (!botStatus.forwardingEnabled) return;

  if (message.author.bot) return;
  if (!message.guild) return;

  try {
    const supportChannel = await client.channels.fetch(
      "1509930654735925499",
    );

    if (!supportChannel) return;

    const content = message.content || "*No text*";

    // Get attachment URLs
    const attachments = message.attachments.map(
      (attachment) => attachment.url,
    );

    // Clone embeds if any
    const embeds = [];

    if (message.embeds.length > 0) {
      for (const embed of message.embeds) {
        embeds.push(EmbedBuilder.from(embed));
      }
    }

    // Main log message
    let logMessage = `📩 **Message Log**
👤 **User:** ${message.author.tag} (${message.author.id})
🏠 **Server:** ${message.guild.name} (${message.guild.id})
📢 **Channel:** #${message.channel.name} (${message.channel.id})
🕒 **Time:** <t:${Math.floor(message.createdTimestamp / 1000)}:F>

💬 **Message:**
\`\`\`
${content}
\`\`\`
`;

    if (attachments.length > 0) {
      logMessage += `\n📎 **Attachments:**\n${attachments.join("\n")}`;
    }

    await supportChannel.send({
      content: logMessage,
      embeds,
    });
  } catch (error) {
    console.error("❌ Failed to forward message:", error);
  }
}