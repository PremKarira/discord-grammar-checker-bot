import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import { initDB } from "./config/db.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleVoiceStateUpdate } from "./events/voiceJoinHandler.js";
import { handlePresenceUpdate } from "./events/presenceUpdate.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";
import { startN8nStatusMonitor } from "./utils/n8nStatus.js";
import { EmbedBuilder } from "discord.js";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const PREFIX = process.env.DISCORD_PREFIX || "!";
const OWNER_ID = process.env.OWNER_ID || "";
const isBotActive = { value: false };

await initDB();

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startN8nStatusMonitor(client, isBotActive);
});

client.on("messageCreate", async (message) => {
  await handleMessageCreate(client, message, PREFIX, OWNER_ID, isBotActive);
  if (
    message.content.startsWith("--cloneherefrom") &&
    message.author.id === `428902961847205899`
  ) {
    const { channel, content } = message;
    channel.send("Cloning messages...");
    let text = content.slice(16);
    const sourcee = text;
    if (client.channels.cache.get(sourcee)) {
      const arr = [];
      var i = 0;
      var temp = 11;
      var fetched = await client.channels.cache
        .get(sourcee)
        .messages.fetch({ limit: 100 });
      fetched.forEach((element) => {
        arr[i] = element;
        i++;
      });

      temp = fetched.last().id;
      while (1) {
        fetched = await client.channels.cache.get(sourcee).messages.fetch({
          limit: 100,
          before: temp,
        });
        fetched.forEach((element) => {
          arr[i] = element;
          i++;
        });
        if (fetched.last()) {
          channel
            .send({ content: `${i}` })
            .then((msg) => {
              msg.delete({ timeout: 2000 });
            })
            .catch((err) => console.error(err));
          temp = fetched.last().id;
        } else {
          channel
            .send({ content: `${i}` })
            .then((msg) => {
              msg.delete({ timeout: 2000 });
            })
            .catch((err) => console.error(err));
          break;
        }
      }

      const webhooks1 = await channel.fetchWebhooks();
      const found1 = webhooks1.find(
        (element) => element.name.toLocaleLowerCase("en-US") === `dash`,
      );
      for (var i = arr.length - 1; i >= 0; i--) {
        var abc = 0;

        if (arr[i].attachments.size > 0) {
          arr[i].attachments.forEach((Attachment) => {
            abc++;
            found1.send({
              content: Attachment.url,
              username: arr[i].author.username,
              avatarURL: arr[i].author.displayAvatarURL({ format: "png" }),
            });
          });
        }

        if (arr[i].content) {
          abc++;
          found1.send({
            content: arr[i].content,
            username: arr[i].author.username,
            avatarURL: arr[i].author.displayAvatarURL({ format: "png" }),
          });
        }

        if (arr[i].embeds?.length) {
          for (const emb of arr[i].embeds) {
            if (emb.type === "rich") {
              abc++;

              const rebuiltEmbed = EmbedBuilder.from(emb);

              await found1.send({
                username: arr[i].author.username,
                avatarURL: arr[i].author.displayAvatarURL(),
                embeds: [rebuiltEmbed],
              });
            }
          }
        }

        if (!abc) {
          found1.send({
            content: `https://discord.com/channels/${arr[i].channel.guild.id}/${arr[i].channel.id}/${arr[i].id}`,
            username: arr[i].author.username,
            avatarURL: arr[i].author.displayAvatarURL({ format: "png" }),
          });
          // channel.send(`https://discord.com/channels/${arr[i].channel.guild.id}/${arr[i].channel.id}/${arr[i].id}`);
        }
      }
      found1.send({
        content: `CLoned ${arr.length} messages successfully ~~hope so~~`,
      });
      found1.send({
        content: `Time taken : ${Date.now() - message.createdTimestamp}ms`,
      });
      message.author.send(
        `CLoning ${arr.length} messages in <#${message.channel.id}>`,
      );
      client.users.fetch("428902961847205899", false).then((user) => {
        user.send(
          `Cloning ${arr.length} messages in <#${message.channel.id}>.\nAction initiated by ${message.author.tag}`,
        );
      });
    } else {
      channel.send("Please provide a valid channel ID");
    }
  }

});

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    await handleVoiceStateUpdate(oldState, newState);
  } catch (err) {
    console.error("Voice State Handler Error:", err);
  }
});

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!isBotActive.value) return;
  await handlePresenceUpdate(client, oldPresence, newPresence);
});

client.on("interactionCreate", async (interaction) => {
  await handleInteractionCreate(interaction);
});

const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
