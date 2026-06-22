import { getVoiceTargets } from "../config/db.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AuditLogEvent,
} from "discord.js";

const afkReturnChannels = new Map();
const muteTimers = new Map();
let afkCreating = null;

async function getModerator(guild, memberId, changeKey) {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const logs = await guild.fetchAuditLogs({
    type: AuditLogEvent.MemberUpdate,
    limit: 20,
  });

  const entry = logs.entries.find(
    (e) =>
      e.target?.id === memberId && e.changes?.some((c) => c.key === changeKey),
  );

  return entry?.executor?.tag ?? "Unknown";
}
let creatingAFK = false;

async function getAFKChannel(guild, currentChannel = null) {
  // Find existing AFK VC
  const afkChannel = guild.channels.cache.find(
    (c) => c.isVoiceBased() && c.name.toLowerCase() === "afk",
  );

  if (afkChannel) {
    return afkChannel.id;
  }

  // If another event is already creating AFK, wait
  if (creatingAFK) {
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const existingAFK = guild.channels.cache.find(
      (c) => c.isVoiceBased() && c.name.toLowerCase() === "afk",
    );

    return existingAFK?.id ?? null;
  }

  creatingAFK = true;

  try {
    // Find empty VC
    const emptyVC = guild.channels.cache.find(
      (c) => c.isVoiceBased() && c.members.size === 0,
    );

    if (emptyVC) {
      await emptyVC.setName("AFK").catch(() => {});
      return emptyVC.id;
    }

    // Create AFK in same category
    const newAFK = await guild.channels
      .create({
        name: "AFK",
        type: 2,
        parent: currentChannel?.parentId ?? null,
        reason: "Created automatically for AFK users",
      })
      .catch(() => null);

    return newAFK?.id ?? null;
  } finally {
    creatingAFK = false;
  }
}

export async function handleVoiceStateUpdate(oldState, newState, isBotActive) {
  const GUILD_ID = "875427163598368779";
  const TEXT_CHANNEL_ID = "875427164076531743";
  const AFK_CHANNEL_ID = await getAFKChannel(newState.guild, newState.channel);
  const DEAFEN_LOG_CHANNEL_ID = "1485503633796759744";

  try {
    if (newState.guild.id !== GUILD_ID) return;
    if (newState.member?.user?.bot) return;

    const member = newState.member;
    const memberName = member.displayName;

    // ================= IN VC ROLE =================

    const vcRole = newState.guild.roles.cache.find(
      (r) => r.name.toLowerCase() === "in-vc",
    );

    if (vcRole) {
      const isInVC = !!newState.channelId;

      if (isInVC && !member.roles.cache.has(vcRole.id)) {
        await member.roles.add(vcRole).catch(() => {});
      }

      if (!isInVC && member.roles.cache.has(vcRole.id)) {
        await member.roles.remove(vcRole).catch(() => {});
      }
    }

    // ================= VOICE LOGS =================

    const logChannel = await newState.guild.channels
      .fetch(DEAFEN_LOG_CHANNEL_ID)
      .catch(() => null);

    const sendLog = async (message) => {
      if (!logChannel) return;
      await logChannel.send({ content: message }).catch(() => {});
    };

    if (oldState.channelId === newState.channelId && newState.channelId) {
      // Self Deafen
      if (oldState.selfDeaf !== newState.selfDeaf) {
        await sendLog(
          newState.selfDeaf
            ? `🔇 **${memberName}** deafened themselves.`
            : `🔊 **${memberName}** undeafened themselves.`,
        );
      }

      // Server Deafen
      if (oldState.serverDeaf !== newState.serverDeaf) {
        const moderator = await getModerator(newState.guild, member.id, "deaf");

        await sendLog(
          newState.serverDeaf
            ? `🔇 **${memberName}** was server deafened by **${moderator}**.`
            : `🔊 **${memberName}** was server undeafened by **${moderator}**.`,
        );
      }

      // Self Mute
      if (oldState.selfMute !== newState.selfMute) {
        await sendLog(
          newState.selfMute
            ? `🔈 **${memberName}** muted themselves.`
            : `🔊 **${memberName}** unmuted themselves.`,
        );
      }

      // Server Mute
      if (oldState.serverMute !== newState.serverMute) {
        const moderator = await getModerator(newState.guild, member.id, "mute");

        await sendLog(
          newState.serverMute
            ? `🔈 **${memberName}** was server muted by **${moderator}**.`
            : `🔊 **${memberName}** was server unmuted by **${moderator}**.`,
        );
      }

      // Streaming
      if (oldState.streaming !== newState.streaming) {
        await sendLog(
          newState.streaming
            ? `🖥️ **${memberName}** started streaming.`
            : `🛑 **${memberName}** stopped streaming.`,
        );
      }

      // Camera
      if (oldState.selfVideo !== newState.selfVideo) {
        await sendLog(
          newState.selfVideo
            ? `📷 **${memberName}** turned on their camera.`
            : `📷 **${memberName}** turned off their camera.`,
        );
      }
    }

    // ================= AFK LOGIC =================

    const isMuted = newState.selfMute || newState.serverMute;

    const isDeafened = newState.selfDeaf || newState.serverDeaf;

    if (
      isMuted &&
      isDeafened &&
      (!newState.channelId || newState.channelId !== AFK_CHANNEL_ID)
      // && member.id !== "428902961847205899"
    ) {
      if (!muteTimers.has(member.id)) {
        const userId = member.id;

        const timer = setTimeout(async () => {
          try {
            const guild = newState.client.guilds.cache.get(GUILD_ID);
            if (!guild) return;

            const afkChannel = guild.channels.cache.get(AFK_CHANNEL_ID);

            const freshMember = await guild.members
              .fetch(userId)
              .catch(() => null);

            if (!freshMember || !freshMember.voice.channelId) return;

            const isMuted2 =
              freshMember.voice.selfMute || freshMember.voice.serverMute;

            const isDeafened2 =
              freshMember.voice.selfDeaf || freshMember.voice.serverDeaf;

            if (isMuted2 && isDeafened2) {
              if (
                afkChannel &&
                freshMember.voice.channelId !== AFK_CHANNEL_ID
              ) {
                // Save original VC
                afkReturnChannels.set(
                  freshMember.id,
                  freshMember.voice.channelId,
                );
                await freshMember.voice
                  .setChannel(AFK_CHANNEL_ID)
                  .catch(() => {});
              }

              // Add AFK prefix
              const currentName =
                member.nickname || member.displayName || "XYZ";

              if (!currentName.startsWith("[AFK] ")) {
                await freshMember
                  .setNickname(`[AFK] ${currentName}`)
                  .catch(() => {});
              }
            }
          } finally {
            muteTimers.delete(userId);
          }
        }, 1 * 1000);

        muteTimers.set(member.id, timer);
      }
    } else {
      if (muteTimers.has(member.id)) {
        clearTimeout(muteTimers.get(member.id));
        muteTimers.delete(member.id);
      }

      const currentName = member.nickname || member.displayName || "XYZ";
      if (currentName.startsWith("[AFK] ")) {
        const newName = currentName.replace("[AFK] ", "");
        await member.setNickname(newName).catch(() => {});
      }
    }

    // ================= RETURN FROM AFK =================

    if (
      oldState.channelId === AFK_CHANNEL_ID &&
      newState.channelId === AFK_CHANNEL_ID
    ) {
      const wasMuted = oldState.selfMute || oldState.serverMute;

      const wasDeafened = oldState.selfDeaf || oldState.serverDeaf;

      const nowActive = !newState.selfDeaf && !newState.serverDeaf;

      if (wasDeafened && nowActive) {
        const oldVC = afkReturnChannels.get(member.id);

        if (oldVC) {
          const channel = newState.guild.channels.cache.get(oldVC);

          if (channel) {
            await member.voice.setChannel(oldVC).catch(() => {});
          }

          afkReturnChannels.delete(member.id);
        }

        // remove AFK nickname
        const currentName = member.nickname || member.displayName || "XYZ";

        if (currentName.startsWith("[AFK] ")) {
          await member
            .setNickname(currentName.replace("[AFK] ", ""))
            .catch(() => {});
        }
      }
    }

    // ================= JOIN MESSAGE =================

    // if (!isBotActive.value) return;

    const voiceTargets = await getVoiceTargets();

    if (
      voiceTargets.includes(member.id) &&
      !oldState.channelId &&
      newState.channelId
    ) {
      const channel = await newState.guild.channels
        .fetch(TEXT_CHANNEL_ID)
        .catch(() => null);

      if (channel) {
        const deleteButton = new ButtonBuilder()
          .setCustomId("delete_message")
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(deleteButton);

        await channel.send({
          content: `🗣️ ${member.displayName} has joined the voice chat...`,
          components: [row],
        });
      }
    }
  } catch (error) {
    console.error("❌ Error in handleVoiceStateUpdate:", error);
  }
}
