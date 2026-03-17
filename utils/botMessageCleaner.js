const botMessageTracker = new Map();

// ✅ PUT YOUR CHANNEL IDs HERE
const ALLOWED_CHANNELS = [
  "875427164076531743",
  "1352333161719402598",
];
export async function handleBotMessage(message) {
  const channelId = message.channel.id;

  // ❌ Ignore if not in allowed channels
  if (!ALLOWED_CHANNELS.includes(channelId)) return;

  if (!botMessageTracker.has(channelId)) {
    botMessageTracker.set(channelId, []);
  }

  const messages = botMessageTracker.get(channelId);
  messages.push(message);

  if (messages.length > 20) messages.shift();

  if (messages.length === 6) {
    try {
      await message.channel.send(
        "⚠️ Too many bot messages in a non-bot channel.\nReply **yes** in 30s to delete them after 1 minute."
      );

      const filter = (m) =>
        !m.author.bot && m.content.toLowerCase() === "yes";

      const collected = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000,
      });

      if (collected.size > 0) {
        await message.channel.send("🧹 Cleaning bot messages in 1 minute...");

        setTimeout(async () => {
          const msgsToDelete = botMessageTracker.get(channelId) || [];

          for (const msg of msgsToDelete) {
            if (msg.deletable) {
              await msg.delete().catch(() => {});
            }
          }

          botMessageTracker.set(channelId, []);
        }, 60000);
      } else {
        await message.channel.send("❌ Cleanup cancelled.");
      }
    } catch (err) {
      console.error("Cleaner error:", err);
    }
  }
}