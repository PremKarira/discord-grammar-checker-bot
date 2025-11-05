import fetch from "node-fetch";
import { reportError } from "./reportError.js";

const RATE_LIMIT_MS = 2000;
let lastApiCall = 0;

export async function analyzeText(client, message, text, isTest) {
  try {
    const now = Date.now();
    if (now - lastApiCall < RATE_LIMIT_MS) return;
    lastApiCall = now;

    const sanitizedText = text.replace(/\s+/g, " ").trim();
    const analyzingMsg = await message.react("⏳");

    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        text_to_analyze: sanitizedText,
        mode: "You are a grammar correction assistant. Check if this sentence is grammatically correct. If bad: return JSON status:bad,corrected:<fixed sentence>. If good: return JSON status:good.",
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();

    let raw = json.final_result?.replace(/```json|```/g, "").trim();
    if (!raw) throw new Error("Missing 'final_result'");
    const { status, corrected } = JSON.parse(raw);

    // React or reply based on result
    if (status === "bad") {
      await message.react("❌");
      await message.reply(`⚠️ Bad English!\n✅ Correct: ${corrected}`);
    } else if (status === "good") {
      await message.react("✅");
    }

  } catch (err) {
    await reportError(client, err, `AnalyzeText | ${message.author.tag}`);
  }
}
