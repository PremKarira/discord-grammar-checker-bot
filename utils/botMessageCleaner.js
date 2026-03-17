const botMessageTracker = new Map();
const activeCleanups = new Set(); // ✅ NEW

// ✅ PUT YOUR CHANNEL IDs HERE
const ALLOWED_CHANNELS = [
  "875427164076531743",
  "1352333161719402598",
];

export async function handleBotMessage(message) {
  const channelId = message.channel.id;

  if (!ALLOWED_CHANNELS.includes(channelId)) return;

  if (!botMessageTracker.has(channelId)) {
    botMessageTracker.set(channelId, []);
  }

  const messages = botMessageTracker.get(channelId);
  messages.push(message);

  if (messages.length > 20) messages.shift();

  // ❌ If already running cleanup → don't trigger again
  if (activeCleanups.has(channelId)) return;

  if (messages.length >= 6) {
    activeCleanups.add(channelId); // 🔒 lock

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
          activeCleanups.delete(channelId); // 🔓 unlock after done
        }, 60000);
      } else {
        await message.channel.send("❌ Cleanup cancelled.");
        activeCleanups.delete(channelId); // 🔓 unlock if cancelled
      }
    } catch (err) {
      console.error("Cleaner error:", err);
      activeCleanups.delete(channelId); // 🔓 safety unlock
    }
  }
}