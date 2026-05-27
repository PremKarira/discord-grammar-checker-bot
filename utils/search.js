import { GoogleGenAI } from "@google/genai";
import { reportError } from "./reportError.js";
import { MODELS } from "../config/models.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function splitMessage(text, maxLength = 2000) {
  const parts = text.split(/(?=^#{1,3}\s)/gm);

  const chunks = [];
  let current = "";

  for (const part of parts) {
    if ((current + part).length > maxLength) {
      if (current) chunks.push(current.trim());

      if (part.length > maxLength) {
        const lines = part.split("\n");
        let temp = "";
        for (const line of lines) {
          if ((temp + line + "\n").length > maxLength) {
            if (temp) chunks.push(temp.trim());
            temp = line + "\n";
          } else {
            temp += line + "\n";
          }
        }
        if (temp.trim()) chunks.push(temp.trim());
        current = "";
      } else {
        current = part;
      }
    } else {
      current += part;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function searchText(client, message, text) {
  try {
    const searchingReaction = await message.react("⏳");

    // 🤖 Gemini call
    const response = await ai.models.generateContent({
      model: MODELS.MAIN,
      contents: `You are a helpful assistant.
Answer the user's query clearly and concisely.
If needed, format the response using headings (#, ##, ###) for readability.

Query:
${text}`,
      config: {
        temperature: 0.4,
      },
    });

    let finalResult = response.text?.replace(/```/g, "").trim();

    if (!finalResult) throw new Error("Empty Gemini response");

    // Split long text and send each chunk
    const messages = splitMessage(finalResult, 2000);
    for (const msg of messages) {
      await message.reply(msg);
    }

    try {
      await searchingReaction.remove();
    } catch {}
  } catch (err) {
    const guildId = message.guild?.id || "@me";
    const messageLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      client,
      err,
      `SearchText: ${text} | ${message.author.tag} | [Jump to Message](${messageLink})`,
    );
  }
}

export { splitMessage };
