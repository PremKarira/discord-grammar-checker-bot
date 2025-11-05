export async function handleVoiceStateUpdate(oldState, newState) {
  const GUILD_ID = "875427163598368779";
  const USER_ID = "380395559921385473";
  const TEXT_CHANNEL_ID = "875427164076531743";

  try {
    if (newState.guild.id !== GUILD_ID) return;

    if (newState.member.id === USER_ID) {
      const channel = await newState.guild.channels.fetch(TEXT_CHANNEL_ID);
      if (channel) {
        await channel.send("🗣️");
      }
    }
  } catch (error) {
    console.error("❌ Error in handleVoiceStateUpdate:", error);
  }
}
