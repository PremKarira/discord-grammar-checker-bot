import dotenv from "dotenv";
dotenv.config();
import express from "express";
import {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
} from "discord.js";
import { initDB, getBotStatus } from "./config/db.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleVoiceStateUpdate } from "./events/voiceJoinHandler.js";
import { handlePresenceUpdate } from "./events/presenceUpdate.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";
import { startN8nStatusMonitor } from "./utils/n8nStatus.js";
import { setupVoiceOnReady } from "./utils/overwatchVC.js";
import { EmbedBuilder } from "discord.js";
import { Events } from "discord.js";
import { handleMessageDelete } from "./events/messageDelete.js";
import { handleMessageUpdate } from "./events/messageUpdate.js";
import { forwardMessage } from "./utils/forwardmessage.js";
import { joinVoiceChannel } from "@discordjs/voice";
import { handleDoButtons } from "./commands/doCommand.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
// const client2 = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildPresences,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMembers,
//     GatewayIntentBits.GuildVoiceStates,
//   ],
//   partials: [Partials.Message, Partials.Channel, Partials.Reaction],
// });
// const client3 = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildPresences,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMembers,
//     GatewayIntentBits.GuildVoiceStates,
//   ],
//   partials: [Partials.Message, Partials.Channel, Partials.Reaction],
// });

const PREFIX = process.env.DISCORD_PREFIX || "!";
const OWNER_ID = process.env.OWNER_ID || "";
const isBotActive = { value: false };

await initDB();

const botStatus = {
  commandEnabled: false,
  voiceStateUpdate: false,
  forwardingEnabled: true,
};

const savedStatus = await getBotStatus();

botStatus.commandEnabled = savedStatus.commandEnabled;
botStatus.voiceStateUpdate = savedStatus.voiceStateUpdate;
botStatus.forwardingEnabled = savedStatus.forwardingEnabled;

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startN8nStatusMonitor(client, isBotActive, botStatus);
  // await setupVoiceOnReady(client, "Client 1");
});

// client2.once(Events.ClientReady, async () => {
//   console.log(`✅ Logged in as ${client2.user.tag}`);
//   await setupVoiceOnReady(client2, "Client 2");
// });

// client3.once(Events.ClientReady, async () => {
//   console.log(`✅ Logged in as ${client3.user.tag}`);
//   await setupVoiceOnReady(client3, "Client 3");
// });

// client.on("debug", (d) => console.log("[DEBUG]", d));
// client.on("warn", console.warn);
// client.on("error", console.error);

client.on("messageCreate", async (message) => {
  if (message.content.toLowerCase() === "!!!ping") {
    const messageLatency = Date.now() - message.createdTimestamp;

    return message.reply(
      `🏓 Pong!\n` + `⚡ Message Latency: ${messageLatency}ms`,
    );
  }

  await handleMessageCreate(
    client,
    message,
    PREFIX,
    OWNER_ID,
    isBotActive,
    botStatus,
  );
  await forwardMessage(client, message, PREFIX, botStatus);
});

client.on("messageDelete", async (message) => {
  await handleMessageDelete(message, OWNER_ID);
});

client.on("messageUpdate", async (message) => {
  await handleMessageUpdate(message);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  // if (!isBotActive.value) return;
  try {
    await handleVoiceStateUpdate(oldState, newState, isBotActive);
  } catch (err) {
    console.error("Voice State Handler Error:", err);
  }
});

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!botStatus.voiceStateUpdate) return;
  await handlePresenceUpdate(client, oldPresence, newPresence);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("do_")) {
      return handleDoButtons(client, interaction);
    }
  }
  await handleInteractionCreate(interaction);
});

const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
// client2.login(process.env.DISCORD_TOKEN2);
// client3.login(process.env.DISCORD_TOKEN3);
