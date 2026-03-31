import fetch from "node-fetch";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const pendingExec = new Map(); // userId -> { code, messageId }

// ================= LOGGER =================
async function logToSupport(client, text) {
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
  } catch (err) {
    console.error("Log error:", err);
  }
}

// ================= DO COMMAND =================
export async function doCommand(client, message, task) {
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

    // ✅ store BOTH code + messageId
    pendingExec.set(message.author.id, {
      code,
      messageId: message.id,
    });

    // ⏳ auto-expire
    setTimeout(() => pendingExec.delete(message.author.id), 60000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("do_confirm")
        .setLabel("✅ Confirm")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("do_cancel")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Danger),
    );

    await message.reply({
      content: `⚠️ Confirm execution:\n\`\`\`js\n${code.slice(0, 1800)}\n\`\`\``,
      components: [row],
    });

    await logToSupport(client, `🧠 TASK:\n${task}\n\n💻 CODE:\n${code}`);
  } catch (err) {
    console.error(err);
    await message.reply("❌ Failed to generate code");
  }
}

// ================= BUTTON HANDLER =================
export async function handleDoButtons(client, interaction) {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const data = pendingExec.get(userId);

  if (!data) {
    return interaction.reply({
      content: "❌ No pending task or expired",
      ephemeral: true,
    });
  }

  // 🔒 restrict to original user
  if (interaction.user.id !== userId) {
    return interaction.reply({
      content: "❌ This is not your task",
      ephemeral: true,
    });
  }

  const { code, messageId } = data;

  // CANCEL
  if (interaction.customId === "do_cancel") {
    pendingExec.delete(userId);

    try {
      await interaction.update({
        content: "❌ Cancelled",
        components: [],
      });
    } catch (updateErr) {
      if (updateErr.code === 10008) {
        await interaction.channel.send("❌ Cancelled");
      } else {
        throw updateErr;
      }
    }

    return;
  }

  // CONFIRM
  if (interaction.customId === "do_confirm") {
    pendingExec.delete(userId);

    try {
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor;

      const fn = new AsyncFunction(
        "client",
        "message",
        `
        "use strict";

        const process = undefined;
        const require = undefined;
        const global = undefined;
        const module = undefined;
        const exports = undefined;

        ${code}
        `,
      );

      const message = await interaction.channel.messages.fetch(messageId);

      await fn(client, message);

      try {
        await interaction.update({
          content: "✅ Executed successfully",
          components: [],
        });
      } catch (updateErr) {
        if (updateErr.code === 10008) {
          await interaction.channel.send("✅ Executed successfully");
        } else {
          throw updateErr;
        }
      }

      await logToSupport(
        client,
        `✅ EXECUTED by ${interaction.user.tag}\n\n${code}`,
      );
    } catch (err) {
      console.error(err);

      try {
        await interaction.update({
          content: "❌ Execution failed",
          components: [],
        });
      } catch (updateErr) {
        if (updateErr.code === 10008) {
          await interaction.channel.send("❌ Execution failed");
        } else {
          throw updateErr;
        }
      }

      await logToSupport(client, `❌ ERROR:\n${err.message}\n\nCODE:\n${code}`);
    }
  }
}
