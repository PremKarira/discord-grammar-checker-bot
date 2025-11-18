export async function handleInteractionCreate(interaction) {
  if (!interaction.isButton()) return;

  if (interaction.customId === "delete_message") {
    try {
      await interaction.message.delete();
      await interaction.reply({
        content: "🗑️ Message deleted!",
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  }
}
