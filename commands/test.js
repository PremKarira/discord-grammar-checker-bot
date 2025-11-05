import { analyzeText } from "../utils/analyze.js";

export async function testCommand(message, text) {
  if (!text) return message.reply("⚠️ Please provide text to test.");
  await analyzeText(message.client, message, text, true); // true = test mode
}
