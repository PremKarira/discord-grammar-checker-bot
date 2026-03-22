import { analyzeText } from "../utils/analyze.js";
import { reportError } from "../utils/reportError.js";
import { handleReplyMessage } from "../utils/reply.js";
import { listUsers } from "../commands/list.js";
import { addTester, removeTester } from "../commands/updateTester.js";
import { addTarget, removeTarget } from "../commands/updateTarget.js";
import { addVoiceTarget, removeVoiceTarget } from "../commands/voiceTargets.js";
import { addReplyTarget, removeReplyTarget } from "../commands/replyTargets.js";
import { testCommand } from "../commands/test.js";
import { checkCommand } from "../commands/check.js";
import { snipeCommand } from "../commands/snipe.js";
import { editSnipeCommand } from "../commands/editSnipe.js";
import { searchCommand } from "../commands/search.js";
import { getUsers, saveBotStatus } from "../config/db.js";
import { joinVCCommand, leaveVCCommand } from "../commands/voiceControl.js";
import { handleBotMessage } from "../utils/botMessageCleaner.js";
import { timerCommand } from "../commands/timer.js";

export async function handleMessageCreate(
  client,
  message,
  PREFIX,
  OWNER_ID,
  isBotActive,
  botStatus,
) {
  try {
    if (message.author.bot) {
      await handleBotMessage(message);
      return;
    }

    const users = await getUsers();
    const isOwner = message.author.id === OWNER_ID;
    const isTester = users.testers.includes(message.author.id);
    const isTarget = users.targets.includes(message.author.id);
    const content = message.content.trim();

    // LIST
    if (isOwner && content === `${PREFIX}list`) {
      await listUsers(message, users, botStatus);
      return;
    }

    // TOGGLE
    if ((isOwner || isTester) && content === `${PREFIX}0`) {
      isBotActive.value = !isBotActive.value;
      await message.reply(
        isBotActive.value ? "🟢 Bot is now ACTIVE" : "🔴 Switching off bot",
      );
      return;
    }
    // TEXT TOGGLE
    if ((isOwner || isTester) && content === `${PREFIX}text0`) {
      botStatus.commandEnabled = !botStatus.commandEnabled;

      await saveBotStatus({
        commandEnabled: botStatus.commandEnabled,
        voiceStateUpdate: botStatus.voiceStateUpdate,
      });

      await message.reply(
        botStatus.commandEnabled
          ? "🟢 Command features ENABLED"
          : "🔴 Command features DISABLED",
      );

      return;
    }

    // VC TOGGLE
    if ((isOwner || isTester) && content === `${PREFIX}vc0`) {
      botStatus.voiceStateUpdate = !botStatus.voiceStateUpdate;

      await saveBotStatus({
        commandEnabled: botStatus.commandEnabled,
        voiceStateUpdate: botStatus.voiceStateUpdate,
      });

      await message.reply(
        botStatus.voiceStateUpdate
          ? "🟢 Voice State Update ENABLED"
          : "🔴 Voice State Update DISABLED",
      );

      return;
    }

    // JOIN VC
    if (isOwner && content === `${PREFIX}joinvc`) {
      await joinVCCommand(client, message);
      return;
    }

    // LEAVE VC
    if (isOwner && content === `${PREFIX}leavevc`) {
      await leaveVCCommand(message);
      return;
    }

    // Ignore bot active state only for OWNER
    if (!isOwner && !botStatus.commandEnabled) return;

    // ADD/REMOVE TESTER
    if (isOwner && content.startsWith(`${PREFIX}addtester `)) {
      await addTester(message, content.slice(PREFIX.length + 10).trim());
      return;
    }
    if (isOwner && content.startsWith(`${PREFIX}removetester `)) {
      await removeTester(message, content.slice(PREFIX.length + 13).trim());
      return;
    }

    // ADD/REMOVE TARGET
    if (isOwner && content.startsWith(`${PREFIX}addtarget `)) {
      await addTarget(message, content.slice(PREFIX.length + 10).trim());
      return;
    }
    if (isOwner && content.startsWith(`${PREFIX}removetarget `)) {
      await removeTarget(message, content.slice(PREFIX.length + 13).trim());
      return;
    }
    // ADD/REMOVE VOICE TARGET
    if (isOwner && content.startsWith(`${PREFIX}addvoicetarget `)) {
      await addVoiceTarget(message, content.slice(PREFIX.length + 15).trim());
      return;
    }
    if (isOwner && content.startsWith(`${PREFIX}removevoicetarget `)) {
      await removeVoiceTarget(
        message,
        content.slice(PREFIX.length + 18).trim(),
      );
      return;
    }
    // ADD/REMOVE REPLY TARGET
    if (isOwner && content.startsWith(`${PREFIX}addreplytarget `)) {
      await addReplyTarget(message, content.slice(PREFIX.length + 15).trim());
      return;
    }

    if (isOwner && content.startsWith(`${PREFIX}removereplytarget `)) {
      await removeReplyTarget(
        message,
        content.slice(PREFIX.length + 18).trim(),
      );
      return;
    }

    // TEST COMMAND
    if (content.startsWith(`${PREFIX}test `)) {
      const textToCheck = content.slice(PREFIX.length + 5).trim();
      await testCommand(message, textToCheck);
      return;
    }

    // CHECK COMMAND
    if (content === `${PREFIX}check`) {
      await checkCommand(message);
      return;
    }

    // SNIPE COMMAND
    if (content.startsWith(`${PREFIX}snipe`)) {
      const args = content.split(/\s+/).slice(1);
      await snipeCommand(message, args);
      return;
    }

    if (content === `${PREFIX}editsnipe`) {
      await editSnipeCommand(message);
      return;
    }
    // SEARCH / PROMPT COMMAND (alias)
    if (
      content.startsWith(`${PREFIX}search `) ||
      content.startsWith(`${PREFIX}prompt `)
    ) {
      const textToSearch = content.slice(content.indexOf(" ") + 1).trim();

      await searchCommand(message, [textToSearch]);
      return;
    }
    // SUMMARY COMMAND
    if (content.startsWith(`${PREFIX}summary `)) {
      const number = parseInt(content.slice(`${PREFIX}summary `.length).trim());

      // if (isNaN(number) || number < 1 || number > 100) {
      if (isNaN(number) || number < 1) {
        await message.reply("❌ Please give a valid number (>1).");
        return;
      }

      const { summaryCommand } = await import("../commands/summary.js");
      const { summary100Command } = await import("../commands/summary100.js");
      if (number <= 100) {
        await summaryCommand(message, number);
      } else {
        await summary100Command(message, number);
      }
      return;
    }

    // WAKEUP COMMAND
    if (isTester && content.startsWith(`${PREFIX}wakeup `)) {
      const args = message.mentions.members.first();
      let number = parseInt(content.split(/\s+/)[2]);

      if (!args) {
        await message.reply("❌ Mention a user.");
        return;
      }

      if (isNaN(number) || number < 1) {
        await message.reply(
          "❌ Provide valid number (>0). For now default is 5.",
        );
        number = 5;
      }

      if (number > 10) {
        await message.reply(
          "⚠️ That's a big number! Setting to 10 to prevent issues.",
        );
        number = 10;
      }

      const { wakeupCommand } = await import("../commands/wakeup.js");
      await wakeupCommand(message, args, number);
      return;
    }

    // TIMER COMMAND
    if (content.startsWith(`${PREFIX}timer `)) {
      const input = content.slice(`${PREFIX}timer `.length).trim();
      await timerCommand(message, input);
      return;
    }

    // analyze and forward if author is target
    if (isTarget && content) {
      try {
        const supportChannel = await client.channels.fetch(
          process.env.SUPPORT_CHANNEL_ID,
        );
        if (supportChannel)
          await supportChannel.send(
            `📨 Message from <@${message.author.id}> (${message.author.tag}):\n> ${content}`,
          );
      } catch (err) {
        await reportError(client, err, "Forward target message");
      }
      await analyzeText(client, message, content, false);
    }

    if (isTester && content.startsWith(`${PREFIX}reply `)) {
      const replyText = content.slice(`${PREFIX}reply `.length).trim();

      if (!replyText) {
        return message.reply("Please provide text to reply.");
      }

      await handleReplyMessage(message, content);
    }

    // REPLY TARGET
    if (
      users.replyTargets.includes(message.author.id) &&
      content &&
      !content.startsWith(PREFIX)
    ) {
      await handleReplyMessage(message, content);
    }
  } catch (err) {
    await reportError(client, err, "Message Handler");
  }
}
