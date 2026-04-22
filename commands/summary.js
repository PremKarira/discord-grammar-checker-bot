import { GoogleGenAI } from "@google/genai";
import { splitMessage } from "../utils/search.js";
import { reportError } from "../utils/reportError.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function summaryCommand(message, count) {
  try {
    const reaction = await message.react("⏳");

    // 1️⃣ Fetch last N messages
    const fetched = await message.channel.messages.fetch({ limit: count });

    const msgs = [...fetched.values()]
      .reverse()
      .map((m) => `**${m.author.username}:** ${m.content || "(no text)"}`)
      .join("\n");

    // 2️⃣ Gemini summarization
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Summarize the following Discord conversation in a clean, short, and structured way:\n\n${msgs}`,
      config: {
        temperature: 0.3,
      },
    });

    let finalResult = response.text?.replace(/```/g, "").trim();

    if (!finalResult) throw new Error("Empty Gemini response");

    // 3️⃣ Split & reply
    const chunks = splitMessage(finalResult, 2000);

    for (const c of chunks) {
      await message.reply(c);
    }

    try {
      await reaction.remove();
    } catch {}
  } catch (err) {
    const guildId = message.guild?.id || "@me";
    const link = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      message.client,
      err,
      `SummaryCommand (${count}) | ${message.author.tag} | [Jump](${link})`,
    );
  }
}