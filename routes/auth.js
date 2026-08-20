import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";

const router = express.Router();
let discordClient = null;

export function setAuthDiscordClient(client) {
  discordClient = client;
}

async function notifySupportChannel(req, profile) {
  const channelId = process.env.SUPPORT_CHANNEL_ID;

  if (!discordClient || !channelId) return;

  if (!discordClient.isReady()) {
    await new Promise((resolve) => discordClient.once("ready", resolve));
  }

  const channel = await discordClient.channels.fetch(channelId);

  if (!channel?.isTextBased()) {
    throw new Error("SUPPORT_CHANNEL_ID does not refer to a text channel.");
  }

  const loginInfo = {
    discordProfile: profile,
    loggedInAt: new Date().toISOString(),
    request: {
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
    },
  };

  await channel.send({
    content: `Discord login successful: ${profile.username || profile.id}`,
    files: [
      {
        attachment: Buffer.from(JSON.stringify(loginInfo, null, 2), "utf8"),
        name: "discord-login-info.json",
      },
    ],
  });
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL:
        process.env.DISCORD_CALLBACK_URL ||
        "http://localhost:3000/auth/discord/callback",
      scope: ["identify"],
    },
    (accessToken, refreshToken, profile, done) => done(null, profile),
  ),
);

router.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);
router.use(passport.initialize());
router.use(passport.session());

router.get("/auth/discord", passport.authenticate("discord"));
router.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      await notifySupportChannel(req, req.user);
    } catch (error) {
      console.error("Could not notify support channel about Discord login:", error);
    }

    res.redirect("/");
  },
);
router.get("/auth/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    res.redirect("/");
  });
});

export function requireDiscordLogin(req, res, next) {
  if (req.user) return next();
  return res.redirect("/");
}

export default router;
