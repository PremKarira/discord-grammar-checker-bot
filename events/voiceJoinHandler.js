export async function handleVoiceStateUpdate(oldState, newState) {
  const GUILD_ID = "875427163598368779";
  const USER_ID = "380395559921385473";
  const TEXT_CHANNEL_ID = "875427164076531743";

  // Only care about the specific guild
  if (newState.guild.id !== GUILD_ID) return;

  // User joined a voice channel (oldState.channel null, newState.channel not null)
  if (!oldState.channel && newState.channel && newState.member.id === USER_ID) {
    const channel = await newState.guild.channels.fetch(TEXT_CHANNEL_ID);
    if (channel?.isTextBased()) {
      await channel.send("Aalsi has joined.");
    }
  }
}
