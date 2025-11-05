import { analyzeText } from "../utils/analyze.js";

export async function checkCommand(message) {
  const repliedMessage = message.reference
    ? await message.channel.messages.fetch(message.reference.messageId)
    : null;

  if (!repliedMessage) {
    return message.reply("⚠️ Please reply to a message to check.");
  }

  await analyzeText(message.client, message, repliedMessage.content, true); // true = test mode
}
