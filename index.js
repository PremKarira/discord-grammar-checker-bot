import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

// === Discord Client Setup ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// === Environment Variables ===
const TARGET_USER_IDS = process.env.TARGET_USER_IDS?.split(",") || []; // Multiple targets
const TESTER_IDS = process.env.TESTER_IDS?.split(",") || [];
const OWNER_ID = process.env.OWNER_ID || "428902961847205899";
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_AUTH_HEADER = process.env.N8N_AUTH_HEADER;
const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL_ID;
const RATE_LIMIT_MS = 2000; // 2 seconds per request

let isBotActive = false;
let lastApiCall = 0;

// === Utility: Error Reporter ===
async function reportError(error, context = "General") {
  console.error(`❌ ${context}:`, error);
  try {
    const supportChannel = await client.channels.fetch(SUPPORT_CHANNEL_ID);
    if (supportChannel) {
      const msg = `❌ **Error Report**  
🧩 Context: ${context}  
\`\`\`js
${(error && error.stack) || error.message || error}
\`\`\``;
      await supportChannel.send(msg);
    } else {
      console.warn("⚠️ Support channel not found.");
    }
  } catch (e) {
    console.error("⚠️ Failed to send error report:", e);
  }
}

// === Core: Text Analyzer ===
async function analyzeText(message, text, isTest) {
  try {
    // 🕒 Rate limit
    const now = Date.now();
    if (now - lastApiCall < RATE_LIMIT_MS) {
      console.log("⏳ Skipping due to rate limit.");
      return;
    }
    lastApiCall = now;

    const sanitizedText = text.replace(/\s+/g, " ").trim();

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        text_to_analyze: sanitizedText,
        mode: "You are a grammar correction assistant. Check if this sentence is grammatically correct. If bad: return JSON status:bad,corrected:<fixed sentence>. If good: return JSON status:good.",
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    console.log("🧾 n8n raw JSON:", json);

    let raw = json.final_result;
    if (!raw) throw new Error("Missing 'final_result' field in n8n response.");

    raw = raw.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in final_result: ${raw}`);
    }

    const { status, corrected } = data;
    console.log(`✅ Parsed -> status: ${status}, corrected: ${corrected}`);

    if (status === "bad") {
      await message.reply(`⚠️ Bad English detected!\n✅ Correct: ${corrected}`);
    } else if (status === "good" && isTest) {
      await message.react("👍");
    }
  } catch (err) {
    await reportError(err, `AnalyzeText | From ${message.author.tag}`);
  }
}

// === Discord Message Handler ===
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    const isOwner = message.author.id === OWNER_ID;
    const isTester = TESTER_IDS.includes(message.author.id);
    const isTarget = TARGET_USER_IDS.includes(message.author.id);

    // List targets & testers
    if ((isTester || isOwner) && message.content === `!list`) {
      try {
        const targetMentions =
          TARGET_USER_IDS.map((id) => `<@${id}>`).join(", ") || "None";
        const testerMentions =
          TESTER_IDS.map((id) => `<@${id}>`).join(", ") || "None";

        const replyMsg =
          `📝 **Current Users:**\n\n` +
          `**Targets:** ${targetMentions}\n` +
          `**Testers:** ${testerMentions}`;

        await message.reply(replyMsg);
      } catch (err) {
        await reportError(err, "List command");
      }
      return;
    }

    // Toggle command (!0)
    if ((isTester || isOwner) && message.content === "!0") {
      isBotActive = !isBotActive;
      const status = isBotActive
        ? "🟢 Bot is now ACTIVE"
        : "🔴 Bot is now INACTIVE";
      await message.reply(status);
      return;
    }

    if (!isBotActive) return;

    // Tester: !test command
    if (isTester && message.content.startsWith("!test ")) {
      const inputText = message.content.slice(6).trim();
      if (!inputText) return message.reply("⚠️ Provide text after `!test`.");
      await analyzeText(message, inputText, true);
      return;
    }

    // 🕵️ Check command (reply-based)
    if (isTester && message.content === "!check") {
      if (!message.reference)
        return message.reply("⚠️ Please reply to a message to check.");
      try {
        const repliedMsg = await message.fetchReference();
        if (!repliedMsg.content)
          return message.reply("⚠️ Replied message has no text.");
        console.log(`👀 Tester checking message: ${repliedMsg.content}`);
        await analyzeText(message, repliedMsg.content, true);
      } catch (err) {
        await reportError(err, `!check command by ${message.author.tag}`);
        return message.react("⚠️");
      }
      return;
    }

    // Target user(s)
    if (isTarget) {
      console.log(
        `📩 Message from target user ${message.author.tag}: ${message.content}`
      );
      // Send the target's message to the support channel
      try {
        const supportChannel = await client.channels.fetch(SUPPORT_CHANNEL_ID);
        if (supportChannel && message.content) {
          await supportChannel.send({
            content: `📨 **Message from target user <@${message.author.id}> (${message.author.tag})**\n> ${message.content}`,
          });
        }
      } catch (err) {
        await reportError(
          err,
          `Forwarding message from target ${message.author.tag}`
        );
      }

      // Also run the analyzer if needed
      if (message.content) {
        await analyzeText(message, message.content, false);
      }
    }
  } catch (err) {
    await reportError(err, `Message Handler | ${message.author.tag}`);
  }
});

// === Bot Ready ===
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// === Keep-Alive Server ===
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

// === Login ===
client.login(process.env.DISCORD_TOKEN);
