import { ChannelType } from "discord.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreshMember(guild, id) {
  try {
    return await guild.members.fetch(id);
  } catch {
    return null;
  }
}

export async function wakeupCommand(message) {
  let statusMsg;
  let statusText = "🔊 Starting wakeup...";

  async function updateStatus(text) {
    statusText += `\n${text}`;
    await statusMsg.edit(statusText);
  }

  try {
    const member = message.mentions.members.first();
    let times = parseInt(message.content.split(/\s+/)[2]);

    statusMsg = await message.reply(statusText);

    if (!member) {
      await updateStatus("❌ Mention a user.");
      return;
    }

    if (isNaN(times) || times < 1) {
      times = 5;

      await updateStatus("❌ Invalid number. Using default 5.");
    }

    if (times > 10) {
      times = 10;

      await updateStatus(
        "⚠️ That's a big number! Setting to 10 to prevent issues.",
      );
    }

    let currentMember = await getFreshMember(message.guild, member.id);

    if (!currentMember) {
      await updateStatus("⚠️ User left the server.");
      return;
    }

    if (!currentMember.voice.channel) {
      await updateStatus("❌ User is not in a voice channel.");
      return;
    }

    const originalChannel = currentMember.voice.channel;

    const voiceChannels = message.guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildVoice &&
        c.id !== originalChannel.id &&
        c.viewable &&
        c.joinable &&
        (!c.userLimit || c.members.size < c.userLimit),
    );

    if (!voiceChannels.size) {
      await updateStatus("❌ No available voice channels.");
      return;
    }

    const channelsArray = [...voiceChannels.values()];

    let lastMovedChannel = originalChannel;

    await updateStatus(
      `🔊 Waking up ${currentMember.user.tag} ${times} times 😈`,
    );

    for (let i = 0; i < times; i++) {
      currentMember = await getFreshMember(message.guild, member.id);

      if (!currentMember) {
        await updateStatus("⚠️ User left the server. Stopping.");
        return;
      }

      // User left VC
      if (!currentMember.voice.channel) {
        await updateStatus("⚠️ User left voice. Stopping.");
        return;
      }

      // User manually moved
      if (currentMember.voice.channel.id !== lastMovedChannel.id) {
        await updateStatus("⚠️ User moved manually. Stopping.");
        return;
      }

      const randomChannel =
        channelsArray[Math.floor(Math.random() * channelsArray.length)];

      try {
        await currentMember.voice.setChannel(randomChannel);
      } catch (err) {
        if (err.code === 40032) {
          await updateStatus("⚠️ User left voice. Stopping.");
          return;
        }

        throw err;
      }

      // Wait for Discord voice state update
      await delay(500);

      lastMovedChannel = randomChannel;

      await delay(800);
    }

    currentMember = await getFreshMember(message.guild, member.id);

    if (!currentMember) {
      await updateStatus("⚠️ User left the server.");
      return;
    }

    // Move back only if still in bot moved channel
    if (
      currentMember.voice.channel &&
      currentMember.voice.channel.id === lastMovedChannel.id
    ) {
      try {
        await currentMember.voice.setChannel(originalChannel);
      } catch (err) {
        if (err.code === 40032) {
          await updateStatus("⚠️ User left before moving back.");
          return;
        }

        throw err;
      }

      await updateStatus("✅ Done. Back to original VC.");
    } else {
      await updateStatus("⚠️ Finished, but user moved/left. Not moving back.");
    }
  } catch (err) {
    console.error(err);

    if (statusMsg) {
      await updateStatus("❌ Failed to wake up user.");
    }
  }
}
