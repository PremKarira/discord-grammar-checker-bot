import { GoogleGenAI } from "@google/genai";
import { reportError } from "./reportError.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const RATE_LIMIT_MS = 2000;
const lastCall = new Map();

export async function analyzeText(client, message, text, isTest) {
  try {
    // 🧩 Rate limiting per user
    const now = Date.now();
    if (
      lastCall.has(message.author.id) &&
      now - lastCall.get(message.author.id) < RATE_LIMIT_MS
    )
      return;
    lastCall.set(message.author.id, now);

    const sanitizedText = text.replace(/\s+/g, " ").trim();
    const analyzingReaction = await message.react("⏳");

    // 🤖 Gemini call
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `You are a grammar correction assistant.
Check if this sentence is grammatically correct (ignore punctuation mistakes).

If correct, respond in two lines:
good
<same sentence>

If incorrect, respond in two lines:
bad
<corrected sentence>

Sentence:
${sanitizedText}`,
      config: {
        temperature: 0.2,
      },
    });

    let raw = response.text?.replace(/```/g, "").trim();

    if (!raw) throw new Error("Empty Gemini response");

    // 📋 Split lines (expecting two-line format)
    const [statusLine, ...rest] = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const status = statusLine?.toLowerCase();
    const corrected = rest.join(" ");

    // 💬 Respond based on grammar check result
    if (status === "bad") {
      await message.react("❌");
      await message.reply(`⚠️ Bad English!\n✅ Correct: ${corrected}`);
    } else if (status === "good") {
      await message.react("✅");
    } else {
      await message.react("❓");
      await message.reply(`Unexpected response:\n${raw}`);
    }

    // ✅ Clean up ⏳ reaction
    try {
      await analyzingReaction.remove();
    } catch {}
  } catch (err) {
    const guildId = message.guild?.id || "@me";
    const messageLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      client,
      err,
      `AnalyzeText: ${text} | ${message.author.tag} | [Jump to Message](${messageLink})`,
    );
  }
}