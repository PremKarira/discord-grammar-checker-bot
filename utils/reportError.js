export async function reportError(client, error, context = "General") {
  console.error(`❌ ${context}:`, error);
  try {
    const supportChannel = await client.channels.fetch(process.env.SUPPORT_CHANNEL_ID);
    if (supportChannel) {
      await supportChannel.send(`❌ **Error Report**\n🧩 Context: ${context}\n\`\`\`js\n${error.stack || error}\n\`\`\``);
    }
  } catch (e) {
    console.error("⚠️ Failed to send error report:", e);
  }
}
