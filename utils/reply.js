import fetch from "node-fetch";
import { reportError } from "./reportError.js";

export async function handleReplyMessage(message, text) {
  try {
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        text_to_analyze: text,
        mode: `You are a friendly and concise AI assistant.
Respond naturally to the user message. Keep replies short, clear, and useful.
Avoid emojis unless the user uses them. Do not over-explain.
If the user asks a question, answer directly. If they greet, greet back.
If message is blank or unclear, ask politely for clarification.
Dont ask questions, just generate a reply with little bit of humor.
Use same language as the user.`,
      }),
    });

    let raw = await response.text();
    raw = raw.replace(/```/g, "").trim();

    let output = raw;

    // 📌 Try parsing JSON to extract final_result
    try {
      const parsed = JSON.parse(raw);
      if (parsed.final_result) output = parsed.final_result;
    } catch {
      // ignore
    }

    if (!output) throw new Error("Empty reply content");
    await message.reply(output);
  } catch (err) {
    await reportError(
      null,
      err,
      `ReplyMessage Error: message from ${message.author.tag}`,
    );
  }
}
