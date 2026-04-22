import fetch from "node-fetch";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";

const pendingExec = new Map(); // userId -> { code, messageId, execId, task }

function replaceMentionsWithIds(message, text) {
  // replace user mentions <@123> or <@!123>
  text = text.replace(/<@!?(\d+)>/g, (match, id) => {
    return id;
  });

  // replace role mentions <@&123>
  text = text.replace(/<@&(\d+)>/g, (match, id) => {
    return id;
  });

  // replace channel mentions <#123>
  text = text.replace(/<#(\d+)>/g, (match, id) => {
    return id;
  });

  return text;
}

// ================= LOGGER =================
export async function logToSupport(client, text) {
  try {
    const channel = await client.channels.fetch(process.env.SUPPORT_CHANNEL_ID);
    if (!channel) return;

    if (text.length > 1900) {
      const buffer = Buffer.from(text, "utf-8");
      await channel.send({
        files: [{ attachment: buffer, name: "log.txt" }],
      });
    } else {
      await channel.send(`\`\`\`\n${text}\n\`\`\``);
    }
  } catch {}
}

// ================= DO COMMAND =================
export async function doCommand(client, message, task, PREFIX) {
  const execId = `EXEC-${Date.now()}`;
  task = replaceMentionsWithIds(message, task);

  try {
    const res = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_AUTH_HEADER,
      },
      body: JSON.stringify({
        text_to_analyze: task,
        mode: `
You are a Discord bot code generator.

STRICT RULES:
- Return ONLY executable JavaScript (no JSON, no markdown)
- Do NOT wrap inside any command handler
- Assume this runs directly inside a function
- Only use: client, message
- Do NOT use process, require, fs
- NEVER use hardcoded IDs
- Always use message.member
- Use discord.js v14
- Use await (no .then)
- NEVER use require or import
- EmbedBuilder and AttachmentBuilder are already available

Examples:

const role = await message.guild.roles.create({
  name: "alpha",
  color: "Red"
});
await message.member.roles.add(role);

await message.channel.send("hello");

ONLY RETURN RAW CODE
`,
      }),
    });

    let raw = await res.text();
    raw = raw.replace(/```/g, "").trim();

    let code = raw;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.final_result) code = parsed.final_result;
    } catch {}

    if (!code) return message.reply("❌ Empty AI response");

    pendingExec.set(message.author.id, {
      code,
      messageId: message.id,
      execId,
      task,
    });

    setTimeout(() => pendingExec.delete(message.author.id), 60000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}do_confirm`)
        .setLabel("✅ Confirm")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`${PREFIX}do_cancel`)
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply({
      content: `⚠️ Confirm execution\nID: ${execId}\n\`\`\`js\n${code.slice(
        0,
        1500
      )}\n\`\`\``,
      components: [row],
    });

    await logToSupport(
      client,
      `🧠 NEW TASK\nID: ${execId}\nUSER: ${message.author.tag}\n\nTASK:\n${task}\n\nCODE:\n${code}`
    );
  } catch (err) {
    console.error(err);
    await message.reply("❌ Failed to generate code");
  }
}

// ================= BUTTON HANDLER =================
export async function handleDoButtons(client, interaction, PREFIX) {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const data = pendingExec.get(userId);

  if (!data) {
    return interaction.reply({
      content: "❌ No pending task",
      ephemeral: true,
    });
  }

  const { code, messageId, execId, task } = data;

  if (interaction.customId === `${PREFIX}do_cancel`) {
    pendingExec.delete(userId);
    return interaction.update({ content: "❌ Cancelled", components: [] });
  }

  if (interaction.customId === `${PREFIX}do_confirm`) {
    pendingExec.delete(userId);

    try {
      await interaction.deferUpdate().catch(() => {});

      const AsyncFunction = Object.getPrototypeOf(
        async function () {}
      ).constructor;

      const fn = new AsyncFunction(
        "client",
        "message",
        "EmbedBuilder",
        "AttachmentBuilder",
        `
"use strict";
const process = undefined;
const require = undefined;
const global = undefined;
const module = undefined;
const exports = undefined;

${code}
`
      );

      const message = await interaction.channel.messages.fetch(messageId);

      const start = Date.now();

      await fn(client, message, EmbedBuilder, AttachmentBuilder);

      const time = Date.now() - start;

      await interaction.editReply({
        content: `✅ Executed (${time}ms)`,
        components: [],
      }).catch(() => {});

      await logToSupport(
        client,
        `✅ SUCCESS\nID: ${execId}\nUSER: ${interaction.user.tag}\nTIME: ${time}ms\n\nTASK:\n${task}`
      );
    } catch (err) {
      console.error(err);

      await interaction
        .editReply({
          content: "❌ Execution failed",
          components: [],
        })
        .catch(() => {});

      await logToSupport(
        client,
        `❌ FAILURE\nID: ${execId}\nUSER: ${interaction.user.tag}\n\nTASK:\n${task}\n\nERROR:\n${err.stack}\n\nCODE:\n${code}`
      );
    }
  }
}