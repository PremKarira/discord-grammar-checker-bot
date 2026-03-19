const botMessageTracker = new Map();
const activeCleanups = new Set();
const cooldowns = new Map();

const ALLOWED_CHANNELS = [
  "875427164076531743",
  "1352333161719402598",
];

// CONFIG
const MESSAGE_THRESHOLD = 6;
const TRACK_LIMIT = 20;
const TIME_WINDOW = 60 * 1000; // 1 min
const CLEANUP_DELAY = 60 * 1000; // 1 min
const COOLDOWN_TIME = 2 * 60 * 1000; // 2 min

export async function handleBotMessage(message) {
  const channelId = message.channel.id;

  if (!ALLOWED_CHANNELS.includes(channelId)) return;
  if (cooldowns.has(channelId)) return;

  // init tracker
  if (!botMessageTracker.has(channelId)) {
    botMessageTracker.set(channelId, []);
  }

  let messages = botMessageTracker.get(channelId);

  // push with timestamp
  messages.push({ msg: message, time: Date.now() });

  // limit size
  if (messages.length > TRACK_LIMIT) messages.shift();

  // filter last 1 min messages
  const now = Date.now();
  messages = messages.filter((m) => now - m.time < TIME_WINDOW);
  botMessageTracker.set(channelId, messages);

  // avoid duplicate cleanup
  if (activeCleanups.has(channelId)) return;

  if (messages.length >= MESSAGE_THRESHOLD) {
    activeCleanups.add(channelId);

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
          const msgsToDelete =
            botMessageTracker.get(channelId) || [];

          for (const m of msgsToDelete) {
            if (m.msg.deletable) {
              await m.msg.delete().catch(() => {});
            }
          }

          // reset tracker
          botMessageTracker.set(channelId, []);
          activeCleanups.delete(channelId);
        }, CLEANUP_DELAY);
      } else {
        await message.channel.send("❌ Cleanup cancelled.");

        // reset tracker so it can trigger again
        botMessageTracker.set(channelId, []);

        // remove active flag BEFORE cooldown
        activeCleanups.delete(channelId);

        // apply cooldown
        cooldowns.set(channelId, true);
        setTimeout(() => {
          cooldowns.delete(channelId);
        }, COOLDOWN_TIME);
      }
    } catch (err) {
      console.error("Cleaner error:", err);

      // fail-safe reset
      activeCleanups.delete(channelId);
      botMessageTracker.set(channelId, []);
    }
  }
}