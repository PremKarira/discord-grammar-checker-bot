import { joinVoiceChannel } from "@discordjs/voice";

const GUILD_ID = "875427163598368779";
const VOICE_ID = "1472971349441122347";

export async function setupVoiceOnReady(client, name = "Bot") {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
      console.log(`❌ ${name} Guild not found`);
      return;
    }

    const channel = await guild.channels.fetch(VOICE_ID);
    if (!channel?.isVoiceBased()) {
      console.log(`❌ ${name} VC not found`);
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    connection.on("stateChange", (oldState, newState) => {
      console.log(`${name} state:`, newState.status);
    });
    connection.on("error", (err) => {
      console.error(`${name} Voice Error:`, err.message);
    });

    console.log(`🎙 ${name} joined VC`);
  } catch (error) {
    console.error(`❌ ${name} failed to join VC:`, error);
  }
}
