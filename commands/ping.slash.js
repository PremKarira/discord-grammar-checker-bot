export default {
  name: "ping",
  description: "Replies with Pong!",

  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: false });
      }

      await interaction.editReply("🏓 Pong!");
    } catch (err) {
      if (err.code === 40060) {
        console.warn(
          "Ping command: Interaction already acknowledged, ignoring.",
        );
      } else {
        console.error("Ping command error:", err);
      }
    }
  },
};
