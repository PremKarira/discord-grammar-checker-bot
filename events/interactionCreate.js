import fs from "fs";
import path from "path";

const commands = {};
const commandsPath = path.resolve("commands");

for (const file of fs.readdirSync(commandsPath)) {
  // Only load slash-command files
  if (!file.endsWith(".slash.js")) continue;

  const cmd = (await import(`../commands/${file}`)).default;

  // Validate structure
  if (!cmd || !cmd.name || !cmd.description || !cmd.execute) {
    console.warn(`⚠️ Invalid slash command skipped: ${file}`);
    continue;
  }

  commands[cmd.name] = cmd;
}

export async function handleInteractionCreate(interaction) {
  if (interaction.isButton()) {
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
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands[interaction.commandName];
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("Slash Command Error:", err);
  }
}
