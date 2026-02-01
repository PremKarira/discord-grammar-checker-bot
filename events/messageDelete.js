import { snipes } from "../utils/snipeStore.js";

export async function handleMessageDelete(message) {
  if (!message?.content && message.attachments.size === 0) return;
  if (message.author?.bot) return;

  const data = {
    content: message.content || "(no text)",
    authorId: message.author.id,
    authorTag: message.author.tag,
    createdAt: message.createdTimestamp,
    attachments: [...message.attachments.values()].map((a) => a.url),
  };

  const list = snipes.get(message.channel.id) || [];
  list.unshift(data);

  if (list.length > 5) list.pop(); // keep last 5 only
  snipes.set(message.channel.id, list);

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
        roles: [], // prevent role pings
        everyone: false, // prevent @everyone abuse
      },
    });
  } catch (err) {
    console.error("❌ messageDelete handler error:", err);
  }
}
