import fetch from "node-fetch";
import { reportError } from "./reportError.js";

const RATE_LIMIT_MS = 2000;
let lastApiCall = 0;

export async function analyzeText(client, message, text, isTest) {
  try {
    const lastCall = new Map(); // userId -> timestamp
    const now = Date.now();
    if (
      lastCall.has(message.author.id) &&
      now - lastCall.get(message.author.id) < RATE_LIMIT_MS
    )
      return;
    lastCall.set(message.author.id, now);

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
        // mode: "You are a grammar correction assistant. Check if this sentence is grammatically correct. If bad: return JSON status:bad,corrected:<fixed sentence>. If good: return JSON status:good.",
        // mode: 'You are a grammar correction assistant. Respond ONLY in JSON. Example: {"status": "good"} or {"status": "bad", "corrected": "<corrected sentence>"}. Do not include extra text, explanations, or markdown.',
        mode: `You are a grammar correction assistant.
Check if this sentence is grammatically correct. ignore punctuation mistakes.
If the sentence is correct, respond in two lines:
1st line: "good"
2nd line: repeat the same sentence.

If the sentence is incorrect, respond in two lines:
1st line: "bad"
2nd line: corrected version.
No explanations, no extra words.`,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    // // console.log(json.final_result);
    // let raw = json.final_result?.replace(/```json|```/g, "").trim();
    // if (!raw) throw new Error("Missing 'final_result'");

    // // Try to safely parse JSON, or fallback to regex parsing
    // let status, corrected;
    // try {
    //   ({ status, corrected } = JSON.parse(raw));
    // } catch (e) {
    //   // Fallback: try to parse text like "JSON status:bad,corrected:Is the office day over?"
    //   const match = raw.match(
    //     /status\s*[:=]\s*(\w+)[,\n\s]+corrected\s*[:=]\s*(.+)/i
    //   );
    //   if (match) {
    //     status = match[1].toLowerCase();
    //     corrected = match[2].trim();
    //   } else {
    //     throw new Error(`Unrecognized response format: ${raw}`);
    //   }
    // }

    // // React or reply based on result
    // if (status === "bad") {
    //   await message.react("❌");
    //   await message.reply(`⚠️ Bad English!\n✅ Correct: ${corrected}`);
    // } else if (status === "good") {
    //   await message.react("✅");
    // }
    let raw = (json.final_result || json.text || json.output)
      ?.replace(/```/g, "")
      .trim();
    if (!raw)
      throw new Error(`Missing 'final_result' in: ${JSON.stringify(json)}`);

    const [statusLine, ...rest] = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const status = statusLine?.toLowerCase();
    const corrected = rest.join(" ");

    // React or reply
    if (status === "bad") {
      await message.react("❌");
      await message.reply(`⚠️ Bad English!\n✅ Correct: ${corrected}`);
    } else if (status === "good") {
      await message.react("✅");
    } else {
      await message.react("❓");
      await message.reply(`Unexpected response:\n${raw}`);
    }
    try {
      await analyzingMsg.remove();
    } catch {}
  } catch (err) {
    const guildId = message.guild?.id || "@me";
    const messageLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      client,
      err,
      `AnalyzeText: ${text} | ${message.author.tag} | [Jump to Message](${messageLink})`
    );
  }
}
