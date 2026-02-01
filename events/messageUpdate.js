import { editSnipes } from "../utils/snipeStore.js";

export async function handleMessageUpdate(oldMsg, newMsg) {
  try {
    // Sometimes Discord passes only ONE object
    if (!oldMsg) return;

    // Fetch partial old message
    if (oldMsg.partial) {
      try {
        oldMsg = await oldMsg.fetch();
      } catch {
        return;
      }
    }

    // Fetch partial new message (if exists)
    if (newMsg?.partial) {
      try {
        newMsg = await newMsg.fetch();
      } catch {
        return;
      }
    }

    // If newMsg is missing, try to read edited content from oldMsg.reactions.message
    if (!newMsg && oldMsg.reactions?.message) {
      newMsg = oldMsg.reactions.message;
    }

    // Hard guards (VERY IMPORTANT)
    if (!newMsg) return;
    if (!oldMsg.content || !newMsg.content) return;
    if (oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;

    editSnipes.set(oldMsg.channel.id, {
      before: oldMsg.content,
      after: newMsg.content,
      authorId: oldMsg.author.id,
      authorTag: oldMsg.author.tag,
      editedAt: Date.now(),
    });
  } catch (err) {
    console.error("❌ handleMessageUpdate error:", err);
  }
}
