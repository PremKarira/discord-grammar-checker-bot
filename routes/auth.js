import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";

const router = express.Router();

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
  }),
);
router.use(passport.initialize());
router.use(passport.session());

router.get("/auth/discord", passport.authenticate("discord"));
router.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/upload" }),
  (req, res) => res.redirect("/upload"),
);
router.get("/auth/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    res.redirect("/upload");
  });
});

export default router;
