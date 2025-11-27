import { searchText } from "../utils/search.js";

export async function searchCommand(message, args) {
  const text = args.join(" ").trim();

  if (!text) {
    return message.reply("⚠️ Please type something to search.\nExample: `!search how to cook rice`");
  }

  await searchText(message.client, message, text);
}
