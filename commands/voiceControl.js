import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

const DEFAULT_GUILD_ID = "875427163598368779";
const DEFAULT_VC_ID = "1472971349441122347";

export async function joinVCCommand(client, message) {
  let channel;

  // ✅ If user is in VC → use that
  if (message.member.voice.channel) {
    channel = message.member.voice.channel;
  } 
  // ✅ Otherwise → use default VC
  else {
    const guild = client.guilds.cache.get(DEFAULT_GUILD_ID);
    if (!guild) {
      await message.reply("❌ Default guild not found.");
      return;
    }

    channel = guild.channels.cache.get(DEFAULT_VC_ID);
    if (!channel || !channel.isVoiceBased()) {
      await message.reply("❌ Default voice channel not found.");
      return;
    }
  }

  // Prevent duplicate connections
  const existing = getVoiceConnection(channel.guild.id);
  if (existing) {
    existing.destroy();
  }

  joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });

  await message.reply(`🎙 Joined ${channel.name}`);
}

export async function leaveVCCommand(message) {
  const connection = getVoiceConnection(message.guild.id);

  if (!connection) {
    await message.reply("❌ I'm not in a voice channel.");
    return;
  }

  connection.destroy();
  await message.reply("👋 Left the voice channel.");
}
