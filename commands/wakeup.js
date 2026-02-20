import { ChannelType } from "discord.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function wakeupCommand(message, member, times) {
  try {
    if (!member.voice.channel) {
      await message.reply("❌ User is not in a voice channel.");
      return;
    }

    const guild = message.guild;
    const originalChannel = member.voice.channel;

    const voiceChannels = guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildVoice && c.id !== originalChannel.id,
    );

    if (!voiceChannels.size) {
      await message.reply("❌ No other voice channels available.");
      return;
    }

    const channelsArray = Array.from(voiceChannels.values());

    await message.reply(`🔊 Waking up ${member.user.tag} ${times} times 😈`);

    let lastMovedChannel = originalChannel;

    for (let i = 0; i < times; i++) {
      // If user left VC
      if (!member.voice.channel) {
        await message.reply("⚠️ User left voice. Stopping.");
        return;
      }

      // If user manually changed channel
      if (member.voice.channel.id !== lastMovedChannel.id) {
        await message.reply("⚠️ User moved manually. Stopping.");
        return;
      }

      const randomChannel =
        channelsArray[Math.floor(Math.random() * channelsArray.length)];

      await member.voice.setChannel(randomChannel);
      lastMovedChannel = randomChannel;

      await delay(800); // prevent rate limit
    }

    // Move back to original channel (only if still in last moved channel)
    if (
      member.voice.channel &&
      member.voice.channel.id === lastMovedChannel.id
    ) {
      await member.voice.setChannel(originalChannel);
      await message.reply("✅ Done. Back to original VC.");
    }
  } catch (err) {
    console.error(err);
    await message.reply("❌ Failed to wake up user.");
  }
}
