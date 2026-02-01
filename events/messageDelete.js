export async function handleMessageDelete(message) {
  try {
    // Ignore bots & system messages
    if (!message || message.author?.bot) return;
    if (!message.content) return;

    // Check if message had ANY mention
    const hasMention =
      message.mentions.users.size > 0 ||
      message.mentions.roles.size > 0 ||
      message.mentions.everyone;

    if (!hasMention) return;

    const authorId = message.author.id;

    const content = message.content;

    await message.channel.send({
      content: `🚨 Ghost Ping\nBy: <@${authorId}>\n\n${content}`,
      allowedMentions: {
        users: [authorId], // ONLY mention author
        roles: [],         // prevent role pings
        everyone: false,   // prevent @everyone abuse
      },
    });
  } catch (err) {
    console.error("❌ messageDelete handler error:", err);
  }
}
