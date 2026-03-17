import parse from "parse-duration";

export async function timerCommand(message, input) {
  try {
    if (!input) {
      await message.reply("❌ Example: `?timer 1m50s wake up`");
      return;
    }

    // Split time + message
    const parts = input.split(" ");
    const timeInput = parts[0];
    const customMsg = parts.slice(1).join(" ") || "Time's up!";

    // ✅ Parse duration (returns ms)
    const duration = parse(timeInput);

    if (!duration || duration <= 0) {
      await message.reply("❌ Invalid time. Use like 1m50s, 5m, 1h, 1h20m");
      return;
    }

    // Optional safety limit
    if (duration > parse("100h")) {
      await message.reply("❌ Max timer is 100 hours.");
      return;
    }

    let remaining = Math.floor(duration / 1000);

    const timerMsg = await message.reply(
      `⏳ Timer started: ${formatTime(remaining)}`,
    );

    const interval = setInterval(async () => {
      remaining--;

      // ⏰ Finished
      if (remaining <= 0) {
        clearInterval(interval);

        // ✅ Send NEW message
        await message.channel.send(`⏰ <@${message.author.id}> ${customMsg}`);

        // Try edit old message (safe)
        try {
          await timerMsg.edit("✅ Timer finished");
        } catch (err) {}

        return;
      }

      // 🔁 Update safely
      if (remaining % 5 === 0 || remaining < 10) {
        try {
          await timerMsg.edit(`⏳ Remaining: ${formatTime(remaining)}`);
        } catch (err) {
          clearInterval(interval); // message deleted → stop
        }
      }
    }, 1000);
  } catch (err) {
    console.error("Timer error:", err);
    await message.reply("❌ Something went wrong with timer.");
  }
}

// ⏱️ Format helper
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m " : ""}${s}s`;
}
