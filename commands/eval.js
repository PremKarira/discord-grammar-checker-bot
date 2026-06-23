import { clean } from "../utils/clean.js";
import { getDB, getMongoClient } from "../config/db.js";

export async function evalCommand(client, message, code) {
  try {
    const db = getDB();
    const mongo = getMongoClient();

    // ================= EMIT =================

    // ================= EMIT =================
    if (code.startsWith("emit()")) {
      if (!message.reference) {
        return message.reply("❌ Reply to a message to use emit()");
      }

      const original = await message.fetchReference();

      if (!original?.content) {
        return message.reply("❌ Invalid replied message");
      }

      const args = code.split(/\s+/);

      let author = original.author;

      if (args.includes("-a")) {
        const index = args.indexOf("-a");

        const mentionArg = args[index + 1];

        if (!mentionArg) {
          return message.reply("❌ Mention a user with -a");
        }

        const userId = mentionArg.replace(/[<@!>]/g, "");

        const user = await client.users.fetch(userId).catch(() => null);

        if (!user) {
          return message.reply("❌ Invalid user");
        }

        author = user;
      }

      const fakeMessage = Object.create(Object.getPrototypeOf(original));

      Object.assign(fakeMessage, original);

      fakeMessage.author = author;

      fakeMessage.client = client;

      fakeMessage.__emitted = true;

      client.emit("messageCreate", fakeMessage);

      return message.reply(
        `⚡ Executed emit()\n> ${fakeMessage.content}\nAuthor: ${author.tag}`,
      );
    }

    // ================= NORMAL EVAL =================

    const result = await Promise.race([
      eval(`
        (async()=>{

          return ${code}

        })()
      `),

      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Eval timeout (10s)"));
        }, 10000);
      }),
    ]);

    const output = await clean(client, result);

    if (output.length > 2000) {
      return message.channel.send({
        files: [
          {
            attachment: Buffer.from(output, "utf8"),

            name: "eval.txt",
          },
        ],
      });
    }

    return message.channel.send(`\`\`\`js\n${output}\n\`\`\``);
  } catch (error) {
    const cleaned = await clean(client, error);

    return message.channel.send(`❌ ERROR:\n\`\`\`js\n${cleaned}\n\`\`\``);
  }
}
