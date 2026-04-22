import { GoogleGenAI } from "@google/genai";
import { reportError } from "./reportError.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function handleReplyMessage(client, message, text) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `You are a friendly and concise AI assistant.
Respond naturally to the user message. Keep replies short, clear, and useful.
Avoid emojis unless the user uses them. Do not over-explain.
If the user asks a question, answer directly. If they greet, greet back.
If message is blank or unclear, ask politely for clarification.
Dont ask questions, just generate a reply with little bit of humor.
Use same language as the user.

Message:
${text}`,
      config: {
        temperature: 0.5,
      },
    });

    let output = response.text?.replace(/```/g, "").trim();

    if (!output) throw new Error("Empty reply content");

    await message.reply(output);
  } catch (err) {
    await reportError(
      client,
      err,
      `ReplyMessage Error: message from ${message.author.tag}`,
    );

    await message.reply(
      err.status === 429
        ? "⚠️ AI is busy right now, try again in a few seconds."
        : "⚠️ Something went wrong while generating reply."
    );
  }
}