import fetch from "node-fetch";
import zlib from "zlib";
import { reportError } from "./reportError.js";

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

    // 🌐 Send to n8n webhook
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        text_to_analyze: sanitizedText,
        mode: `You are a grammar correction assistant.
Check if this sentence is grammatically correct (ignore punctuation mistakes).
If correct, respond in two lines:
1st line: "good"
2nd line: repeat the same sentence.

If incorrect, respond in two lines:
1st line: "bad"
2nd line: corrected version.
No explanations or extra words.`,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // 📦 Handle possible compression
    const buffer = Buffer.from(await response.arrayBuffer());
    const encoding = response.headers.get("content-encoding");
    console.log("Content-Encoding:", encoding);
    let textResponse;
    try {
      switch (encoding) {
        case "br":
          textResponse = zlib.brotliDecompressSync(buffer).toString("utf-8");
          break;
        case "gzip":
          textResponse = zlib.gunzipSync(buffer).toString("utf-8");
          break;
        case "deflate":
          textResponse = zlib.inflateSync(buffer).toString("utf-8");
          break;
        default:
          textResponse = buffer.toString("utf-8");
      }
    } catch {
      textResponse = buffer.toString("utf-8");
    }

    if (!textResponse?.trim()) throw new Error("Empty response from webhook");

    // 🧠 Parse JSON or text output
    let raw = textResponse.replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.final_result) raw = parsed.final_result;
    } catch {
      // not JSON, continue as plain text
    }

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
    // 🧾 Error reporting
    const guildId = message.guild?.id || "@me";
    const messageLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    await reportError(
      client,
      err,
      `AnalyzeText: ${text} | ${message.author.tag} | [Jump to Message](${messageLink})`,
    );
  }
}
