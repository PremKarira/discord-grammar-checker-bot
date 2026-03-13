import { saveBotStatus } from "../config/db.js";

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
      process.env.SUPPORT_CHANNEL_ID,
    );

    if (!supportChannel) return;

    const content = message.content || "*No text (embed/attachment)*";

    await supportChannel.send({
      content: `📩 **Message Log**
👤 **User:** ${message.author.tag} (${message.author.id})
🏠 **Server:** ${message.guild.name} (${message.guild.id})
📢 **Channel:** #${message.channel.name} (${message.channel.id})
🕒 **Time:** <t:${Math.floor(message.createdTimestamp / 1000)}:F>

💬 **Message:**
\`\`\`
${content}
\`\`\``,
    });
  } catch (error) {
    console.error("❌ Failed to forward message:", error);
  }
}
