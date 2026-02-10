let forwardingEnabled = true;

export async function forwardMessage(client, message) {
  if (message.author.id === process.env.OWNER_ID) {
    if (message.content === "!fon") {
      forwardingEnabled = true;
      return message.reply("✅ Message forwarding ENABLED");
    }

    if (message.content === "!foff") {
      forwardingEnabled = false;
      return message.reply("❌ Message forwarding DISABLED");
    }
  }

  if (!forwardingEnabled) return;

  if (message.author.bot) return;

  if (!message.guild) return;

  try {
    const supportChannel = await client.channels.fetch(
      process.env.SUPPORT_CHANNEL_ID
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
\`\`\``
    });

  } catch (error) {
    console.error("❌ Failed to forward message:", error);
  }
}
