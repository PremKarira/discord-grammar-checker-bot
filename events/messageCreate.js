import { analyzeText } from "../utils/analyze.js";
import { reportError } from "../utils/reportError.js";
import { listUsers } from "../commands/list.js";
import { addTester, removeTester } from "../commands/updateTester.js";
import { addTarget, removeTarget } from "../commands/updateTarget.js";
import { addVoiceTarget, removeVoiceTarget } from "../commands/voiceTargets.js";
import { testCommand } from "../commands/test.js";
import { checkCommand } from "../commands/check.js";
import { getUsers } from "../config/db.js";

export async function handleMessageCreate(client, message, PREFIX, OWNER_ID, isBotActive) {
  try {
    if (message.author.bot) return;

    const users = await getUsers();
    const isOwner = message.author.id === OWNER_ID;
    const isTester = users.testers.includes(message.author.id);
    const isTarget = users.targets.includes(message.author.id);
    const content = message.content.trim();

    // LIST
    if ((isOwner || isTester) && content === `${PREFIX}list`) {
      await listUsers(message, users);
      return;
    }

    // TOGGLE
    if ((isOwner || isTester) && content === `${PREFIX}0`) {
      isBotActive.value = !isBotActive.value;
      await message.reply(isBotActive.value ? "🟢 Bot is now ACTIVE" : "🔴 Switching off bot");
      return;
    }

    if (!isBotActive.value) return;

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
      await removeVoiceTarget(message, content.slice(PREFIX.length + 18).trim());
      return;
    }

    // TEST COMMAND
    if ((isOwner || isTester) && content.startsWith(`${PREFIX}test `)) {
      const textToCheck = content.slice(PREFIX.length + 5).trim();
      await testCommand(message, textToCheck);
      return;
    }

    // CHECK COMMAND
    if ((isOwner || isTester) && content === `${PREFIX}check`) {
      await checkCommand(message);
      return;
    }

    // TARGET MESSAGE
    if (isTarget && content) {
      try {
        const supportChannel = await client.channels.fetch(process.env.SUPPORT_CHANNEL_ID);
        if (supportChannel)
          await supportChannel.send(
            `📨 Message from <@${message.author.id}> (${message.author.tag}):\n> ${content}`
          );
      } catch (err) {
        await reportError(client, err, "Forward target message");
      }
      await analyzeText(client, message, content, false);
    }
  } catch (err) {
    await reportError(client, err, "Message Handler");
  }
}
