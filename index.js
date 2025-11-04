import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const TARGET_USER_ID = process.env.TARGET_USER_ID; 
const TESTER_IDS = process.env.TESTER_IDS.split(",");
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_AUTH_HEADER = process.env.N8N_AUTH_HEADER;

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isTester = TESTER_IDS.includes(message.author.id);
  const isTarget = message.author.id === TARGET_USER_ID;

  if (isTester && message.content.startsWith("!test ")) {
    const inputText = message.content.slice(6).trim();
    await analyzeText(message, inputText, true);
    return;
  }

  if (isTarget) {
    await analyzeText(message, message.content, false);
  }
});

async function analyzeText(message, text, isTest) {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        text_to_analyze: text,
        mode: "You are a grammar correction assistant. Check if this sentence is grammatically correct. If bad: return JSON status:bad,corrected:<fixed sentence>. If good: return JSON status:good}."
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json(); 
    console.log("🧾 n8n raw JSON:", json);

    let raw = json.final_result;
    if (!raw) {
      console.error("❌ Missing 'final_result' field in n8n response.");
      return message.reply("⚠️ n8n returned an empty or invalid response.");
    }

    raw = raw.replace(/```json|```/g, "").trim();
    
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ Invalid JSON response from n8n:", raw);
      return message.reply("⚠️ n8n returned invalid response.");
    }
    console.log("n8n response:", data);
    const result = data.final_result ? JSON.parse(data.final_result) : data;

    if (result.status === "bad") {
      await message.reply(`⚠️ Bad English detected!\n✅ Correct sentence: ${result.corrected}`);
    
    } else if (isTest) {
      await message.channel.send(`👍`);
    }
  } catch (err) {
    console.error("❌ Error analyzing text:", err);
    await message.reply("⚠️ Couldn't process your request right now.");
  }
}

client.login(process.env.DISCORD_TOKEN);
import express from "express";

const app = express();
app.get("/", (req, res) => {
  res.send("✅ Discord bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

