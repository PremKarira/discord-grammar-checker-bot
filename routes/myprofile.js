import { Router } from "express";

const router = Router();

const PROFILE_USER_ID = "428902961847205899";

let discordClient = null;

let profilePresence = {
  status: "offline",
  activities: [],
};

/*
|--------------------------------------------------------------------------
| Discord Client
|--------------------------------------------------------------------------
*/

export function setMyProfileDiscordClient(client) {
  discordClient = client;
}

/*
|--------------------------------------------------------------------------
| Live Presence
|--------------------------------------------------------------------------
*/

export function updateMyProfilePresence(presence) {
  if (!presence) return;

  if (presence.userId !== PROFILE_USER_ID) return;

  profilePresence = {
    status: presence.status || "offline",

    activities: (presence.activities || []).map((activity) => ({
      name: activity.name || null,

      type: activity.type ?? null,

      details: activity.details || null,

      state: activity.state || null,

      url: activity.url || null,

      timestamps: activity.timestamps
        ? {
            start: activity.timestamps.start || null,
            end: activity.timestamps.end || null,
          }
        : null,
    })),
  };
}

/*
|--------------------------------------------------------------------------
| HOME
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  res.type("html").send(`
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>Prem</title>

<meta
  name="description"
  content="Prem's Discord Profile"
/>

<style>

/* =========================================================
   VARIABLES
========================================================= */

:root {

  --accent: #130229;

  --accent-light: #3b1670;

  --accent-soft: rgba(19, 2, 41, .55);

  --accent-glow: rgba(19, 2, 41, .75);

  --accent-border: rgba(19, 2, 41, .8);

  --card:
    rgba(13, 10, 20, .82);

  --text:
    #ffffff;

  --muted:
    #a09aaa;

}


/* =========================================================
   RESET
========================================================= */

* {
  box-sizing: border-box;
}

html,
body {

  margin: 0;
  padding: 0;

  width: 100%;
  min-height: 100%;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color: var(--text);

  background: #050307;

}


/* =========================================================
   BODY
========================================================= */

body {

  min-height: 100vh;

  overflow-x: hidden;

  background:

    radial-gradient(
      circle at 10% 0%,
      var(--accent-glow),
      transparent 34%
    ),

    radial-gradient(
      circle at 90% 100%,
      var(--accent-soft),
      transparent 38%
    ),

    #050307;

}


/* =========================================================
   ACCENT ORBS
========================================================= */

.background-orb {

  position: fixed;

  width: 650px;
  height: 650px;

  border-radius: 50%;

  pointer-events: none;

  filter: blur(100px);

  opacity: .48;

  z-index: 0;

}


.orb-one {

  top: -350px;
  left: -280px;

  background:
    var(--accent);

  animation:
    orbOne 14s ease-in-out infinite alternate;

}


.orb-two {

  right: -350px;
  bottom: -350px;

  background:
    var(--accent-light);

  animation:
    orbTwo 18s ease-in-out infinite alternate;

}


@keyframes orbOne {

  from {

    transform:
      translate(0, 0)
      scale(1);

  }

  to {

    transform:
      translate(180px, 130px)
      scale(1.2);

  }

}


@keyframes orbTwo {

  from {

    transform:
      translate(0, 0)
      scale(1);

  }

  to {

    transform:
      translate(-160px, -120px)
      scale(1.2);

  }

}


/* =========================================================
   PAGE
========================================================= */

.page {

  position: relative;

  z-index: 1;

  min-height: 100vh;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 40px 20px;

}


/* =========================================================
   CARD
========================================================= */

.card {

  width: 100%;

  max-width: 760px;

  overflow: hidden;

  border-radius: 26px;

  background:
    var(--card);

  border:
    1px solid
    rgba(255,255,255,.09);

  box-shadow:

    0 45px 120px
    rgba(0,0,0,.72),

    0 0 100px
    var(--accent-soft);

  backdrop-filter:
    blur(30px);

  -webkit-backdrop-filter:
    blur(30px);

  animation:
    cardIn .8s cubic-bezier(.2,.8,.2,1);

}


@keyframes cardIn {

  from {

    opacity: 0;

    transform:
      translateY(35px)
      scale(.97);

  }

  to {

    opacity: 1;

    transform:
      translateY(0)
      scale(1);

  }

}


/* =========================================================
   BANNER
========================================================= */

.banner {

  position: relative;

  height: 260px;

  overflow: hidden;

  background:

    radial-gradient(
      circle at 30% 30%,
      var(--accent-light),
      transparent 45%
    ),

    linear-gradient(
      135deg,
      var(--accent),
      #08050c
    );

}


.banner-image {

  position: absolute;

  inset: 0;

  width: 100%;
  height: 100%;

  object-fit: cover;

  opacity: 0;

  transition:
    opacity .8s ease,
    transform 8s ease;

}


.banner-image.loaded {

  opacity: 1;

  transform:
    scale(1.04);

}


.banner-overlay {

  position: absolute;

  inset: 0;

  z-index: 2;

  background:

    linear-gradient(
      to bottom,
      rgba(0,0,0,.02) 0%,
      rgba(5,3,7,.12) 45%,
      rgba(13,10,20,.98) 100%
    );

}


/* =========================================================
   CONTENT
========================================================= */

.content {

  position: relative;

  padding:
    0 38px 42px;

}


/* =========================================================
   AVATAR WRAPPER
========================================================= */

.avatar-wrapper {

  position: relative;

  width: 150px;
  height: 150px;

  margin-top: -75px;

  z-index: 10;

}


/* =========================================================
   AVATAR
========================================================= */

.avatar {

  position: absolute;

  top: 0;
  left: 0;

  width: 150px;
  height: 150px;

  object-fit: cover;

  border-radius: 50%;

  border:
    7px solid
    #0d0a14;

  background:
    #0d0a14;

  box-shadow:

    0 0 0 1px
    rgba(255,255,255,.05),

    0 0 35px
    var(--accent-glow);

  transition:

    transform .3s ease,

    box-shadow .3s ease;

}


.avatar:hover {

  transform:
    scale(1.045);

  box-shadow:

    0 0 0 1px
    rgba(255,255,255,.12),

    0 0 70px
    var(--accent-glow);

}


/* =========================================================
   AVATAR DECORATION
========================================================= */

.avatar-decoration {

  position: absolute;

  top: -18px;
  left: -18px;

  width: 186px;
  height: 186px;

  object-fit: contain;

  pointer-events: none;

  z-index: 4;

  filter:
    drop-shadow(
      0 7px 15px
      rgba(0,0,0,.45)
    );

}


/* =========================================================
   STATUS
========================================================= */

.status-dot {

  position: absolute;

  right: 4px;
  bottom: 6px;

  width: 32px;
  height: 32px;

  border-radius: 50%;

  border:
    6px solid
    #0d0a14;

  background:
    #747f8d;

  z-index: 20;

  transition:

    background .3s ease,

    box-shadow .3s ease;

}


/* =========================================================
   IDENTITY
========================================================= */

.identity {

  margin-top: 20px;

}


.display-name {

  margin: 0;

  font-size: 36px;

  line-height: 1.15;

  letter-spacing: -.8px;

}


.username {

  margin-top: 6px;

  color:
    var(--muted);

  font-size: 16px;

}


/* =========================================================
   NAMEPLATE
========================================================= */

.nameplate {

  position: relative;

  display: inline-flex;

  align-items: center;

  min-height: 48px;

  margin-top: 14px;

  padding:
    8px 17px;

  overflow: hidden;

  border-radius: 13px;

  border:
    1px solid
    rgba(255,255,255,.13);

  box-shadow:

    0 10px 30px
    rgba(0,0,0,.35);

}


.nameplate::before {

  content: "";

  position: absolute;

  inset: 0;

  background:

    linear-gradient(
      115deg,
      transparent 20%,
      rgba(255,255,255,.16),
      transparent 70%
    );

  animation:
    nameplateShine 4s infinite;

}


@keyframes nameplateShine {

  0% {

    transform:
      translateX(-130%);

  }

  50% {

    transform:
      translateX(130%);

  }

  100% {

    transform:
      translateX(130%);

  }

}


.nameplate-text {

  position: relative;

  z-index: 2;

  font-size: 13px;

  font-weight: 700;

  color: white;

}


/* =========================================================
   GUILD IDENTITY
========================================================= */

.guild-identity {

  display: none;

  align-items: center;

  gap: 9px;

  margin-top: 13px;

}


.guild-badge {

  width: 28px;
  height: 28px;

  border-radius: 7px;

  object-fit: cover;

  box-shadow:
    0 0 15px
    rgba(255,255,255,.12);

}


.guild-tag {

  color:
    #d2ceda;

  font-size: 14px;

  font-weight: 600;

}


/* =========================================================
   BADGES
========================================================= */

.badges {

  display: flex;

  gap: 8px;

  margin-top: 17px;

}


.badge {

  width: 38px;
  height: 38px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 11px;

  background:
    rgba(255,255,255,.045);

  border:
    1px solid
    rgba(255,255,255,.07);

  transition:

    transform .25s ease,

    background .25s ease,

    box-shadow .25s ease;

}


.badge:hover {

  transform:
    translateY(-4px);

  background:
    var(--accent-soft);

  box-shadow:
    0 8px 25px
    var(--accent-soft);

}


/* =========================================================
   DIVIDER
========================================================= */

.divider {

  width: 100%;

  height: 1px;

  margin: 31px 0;

  background:
    rgba(255,255,255,.08);

}


/* =========================================================
   SECTIONS
========================================================= */

.section {

  margin-top: 27px;

}


.section-title {

  margin-bottom: 11px;

  color:
    #85818e;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 1.5px;

}


.about {

  color:
    #dedbe5;

  line-height: 1.65;

}


/* =========================================================
   ACTIVITY
========================================================= */

.activity {

  display: flex;

  align-items: center;

  gap: 15px;

  padding: 17px;

  border-radius: 15px;

  background:
    rgba(255,255,255,.035);

  border:
    1px solid
    rgba(255,255,255,.065);

  transition:

    transform .25s ease,

    background .25s ease,

    border-color .25s ease;

}


.activity:hover {

  transform:
    translateY(-2px);

  background:
    var(--accent-soft);

  border-color:
    rgba(255,255,255,.10);

}


.activity-icon {

  width: 50px;
  height: 50px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 13px;

  background:
    var(--accent-soft);

  box-shadow:
    0 0 25px
    var(--accent-soft);

  font-size: 22px;

}


.activity-name {

  font-weight: 700;

}


.activity-details {

  margin-top: 5px;

  color:
    #92909c;

  font-size: 14px;

}


/* =========================================================
   MEMBER
========================================================= */

.member {

  color:
    #dedbe5;

}


/* =========================================================
   FOOTER
========================================================= */

.footer {

  margin-top: 36px;

  color:
    #64606d;

  font-size: 12px;

  text-align: center;

}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 600px) {

  .page {

    padding:
      15px;

  }


  .banner {

    height:
      185px;

  }


  .content {

    padding:
      0 22px 30px;

  }


  .avatar-wrapper {

    width: 120px;
    height: 120px;

    margin-top:
      -60px;

  }


  .avatar {

    width: 120px;
    height: 120px;

  }


  .avatar-decoration {

    width: 150px;
    height: 150px;

    top: -15px;
    left: -15px;

  }


  .display-name {

    font-size:
      28px;

  }

}


/* =========================================================
   REDUCED MOTION
========================================================= */

@media (
  prefers-reduced-motion: reduce
) {

  *,
  *::before,
  *::after {

    animation-duration:
      .01ms !important;

    animation-iteration-count:
      1 !important;

    transition-duration:
      .01ms !important;

  }

}

</style>

</head>


<body>


<div class="background-orb orb-one"></div>

<div class="background-orb orb-two"></div>


<div class="page">


<div class="card">


<!-- =====================================================
     BANNER
===================================================== -->

<div class="banner">

  <img
    id="banner"
    class="banner-image"
    alt=""
  >

  <div class="banner-overlay"></div>

</div>


<!-- =====================================================
     CONTENT
===================================================== -->

<div class="content">


<!-- =====================================================
     AVATAR
===================================================== -->

<div class="avatar-wrapper">


<img
  id="avatar"
  class="avatar"
  alt="Discord Avatar"
/>


<img
  id="avatarDecoration"
  class="avatar-decoration"
  alt=""
  style="display:none"
/>


<div
  id="statusDot"
  class="status-dot"
></div>


</div>


<!-- =====================================================
     IDENTITY
===================================================== -->

<div class="identity">


<h1
  id="displayName"
  class="display-name"
>
  Loading...
</h1>


<div
  id="username"
  class="username"
>
  @loading
</div>


<!-- NAMEPLATE -->

<div
  id="nameplate"
  class="nameplate"
  style="display:none"
>

  <span
    id="nameplateText"
    class="nameplate-text"
  ></span>

</div>


<!-- PRIMARY GUILD -->

<div
  id="guildIdentity"
  class="guild-identity"
>

  <img
    id="guildBadge"
    class="guild-badge"
    alt=""
  >

  <span
    id="guildTag"
    class="guild-tag"
  ></span>

</div>


<!-- BADGES -->

<div class="badges">

  <div
    class="badge"
    title="Developer"
  >
    💻
  </div>

  <div
    class="badge"
    title="Gamer"
  >
    🎮
  </div>

  <div
    class="badge"
    title="Discord"
  >
    💬
  </div>

  <div
    class="badge"
    title="Live"
  >
    ⚡
  </div>

</div>


</div>


<div class="divider"></div>


<!-- =====================================================
     ABOUT
===================================================== -->

<div class="section">

  <div class="section-title">
    ABOUT ME
  </div>

  <div class="about">
    Developer • Gamer
  </div>

</div>


<!-- =====================================================
     STATUS
===================================================== -->

<div class="section">

  <div class="section-title">
    DISCORD STATUS
  </div>


  <div class="activity">


    <div
      id="activityIcon"
      class="activity-icon"
    >
      ●
    </div>


    <div>


      <div
        id="statusText"
        class="activity-name"
      >
        Loading...
      </div>


      <div
        id="activityText"
        class="activity-details"
      >
        Checking Discord presence...
      </div>


    </div>


  </div>


</div>


<!-- =====================================================
     MEMBER SINCE
===================================================== -->

<div class="section">

  <div class="section-title">
    MEMBER SINCE
  </div>


  <div
    id="memberSince"
    class="member"
  >
    Loading...
  </div>


</div>


<div class="footer">

  Powered by Discord

</div>


</div>


</div>


</div>


<script>

/*
|--------------------------------------------------------------------------
| Status colors
|--------------------------------------------------------------------------
*/

const statusColors = {

  online: "#23a55a",

  idle: "#f0b232",

  dnd: "#f23f42",

  offline: "#747f8d"

};


/*
|--------------------------------------------------------------------------
| Profile
|--------------------------------------------------------------------------
*/

async function loadProfile() {

  try {

    const response =
      await fetch(
        "/api/profile",
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Profile request failed: " +
        response.status
      );

    }


    const profile =
      await response.json();


    console.log(
      "Discord profile:",
      profile
    );


    /*
    ------------------------------------------
    Accent color
    ------------------------------------------
    */

    if (
      profile.accentHex
    ) {

      document.documentElement
        .style
        .setProperty(
          "--accent",
          profile.accentHex
        );


      /*
       * Generate slightly brighter
       * accent automatically.
       */

      const numeric =
        parseInt(
          profile.accentHex.slice(1),
          16
        );


      const r =
        (numeric >> 16) & 255;

      const g =
        (numeric >> 8) & 255;

      const b =
        numeric & 255;


      const brighterR =
        Math.min(
          255,
          Math.floor(
            r + (255 - r) * .45
          )
        );


      const brighterG =
        Math.min(
          255,
          Math.floor(
            g + (255 - g) * .45
          )
        );


      const brighterB =
        Math.min(
          255,
          Math.floor(
            b + (255 - b) * .45
          )
        );


      const brighter =
        "#" +
        brighterR
          .toString(16)
          .padStart(2, "0") +

        brighterG
          .toString(16)
          .padStart(2, "0") +

        brighterB
          .toString(16)
          .padStart(2, "0");


      document.documentElement
        .style
        .setProperty(
          "--accent-light",
          brighter
        );


      document.documentElement
        .style
        .setProperty(
          "--accent-soft",
          "rgba(" +
          r +
          "," +
          g +
          "," +
          b +
          ",.45)"
        );


      document.documentElement
        .style
        .setProperty(
          "--accent-glow",
          "rgba(" +
          r +
          "," +
          g +
          "," +
          b +
          ",.72)"
        );

    }


    /*
    ------------------------------------------
    Avatar
    ------------------------------------------
    */

    const avatar =
      document.getElementById(
        "avatar"
      );


    avatar.src =
      profile.avatar;


    /*
    ------------------------------------------
    Display name
    ------------------------------------------
    */

    document
      .getElementById(
        "displayName"
      )
      .textContent =
      profile.globalName ||
      profile.username ||
      "Unknown";


    /*
    ------------------------------------------
    Username
    ------------------------------------------
    */

    document
      .getElementById(
        "username"
      )
      .textContent =
      "@" +
      profile.username;


    /*
    ------------------------------------------
    Banner
    ------------------------------------------
    */

    if (profile.banner) {

      const banner =
        document.getElementById(
          "banner"
        );


      banner.src =
        profile.banner;


      banner.onload =
        function () {

          banner.classList.add(
            "loaded"
          );

        };

    }


    /*
    ------------------------------------------
    Avatar decoration
    ------------------------------------------
    */

    if (
      profile.avatarDecorationData &&
      profile.avatarDecorationData.url
    ) {

      const decoration =
        document.getElementById(
          "avatarDecoration"
        );


      decoration.src =
        profile.avatarDecorationData.url;


      decoration.onload =
        function () {

          decoration.style.display =
            "block";

        };


      decoration.onerror =
        function () {

          console.warn(
            "Avatar decoration failed:",
            profile.avatarDecorationData.url
          );

          decoration.style.display =
            "none";

        };

    }


    /*
    ------------------------------------------
    Nameplate
    ------------------------------------------
    */

    if (
      profile.collectibles &&
      profile.collectibles.nameplate
    ) {

      const nameplate =
        profile.collectibles.nameplate;


      const element =
        document.getElementById(
          "nameplate"
        );


      const text =
        document.getElementById(
          "nameplateText"
        );


      /*
       * Your current palette is:
       *
       * berry
       */

      const palettes = {

        berry: [
          "#631b46",
          "#b72d70"
        ],

        crimson: [
          "#661b25",
          "#c73243"
        ],

        sky: [
          "#155d80",
          "#3aa9db"
        ],

        teal: [
          "#12665d",
          "#26b5a1"
        ],

        forest: [
          "#1d5b3b",
          "#419b64"
        ],

        violet: [
          "#4f2d82",
          "#9057dc"
        ],

        cobalt: [
          "#234c92",
          "#3974d6"
        ],

        clover: [
          "#286d3c",
          "#54b76a"
        ],

        lemon: [
          "#856d15",
          "#d5b62c"
        ]

      };


      const colors =
        palettes[
          nameplate.palette
        ] ||
        palettes.berry;


      element.style.background =
        "linear-gradient(" +
        "135deg," +
        colors[0] +
        "," +
        colors[1] +
        ")";


      text.textContent =
        nameplate.label ||
        "Discord Nameplate";


      element.title =
        nameplate.label ||
        "Discord Nameplate";


      element.style.display =
        "inline-flex";

    }


    /*
    ------------------------------------------
    Primary guild
    ------------------------------------------
    */

    if (
      profile.primaryGuild &&
      profile.primaryGuild.identityEnabled
    ) {

      const guild =
        profile.primaryGuild;


      const container =
        document.getElementById(
          "guildIdentity"
        );


      const badge =
        document.getElementById(
          "guildBadge"
        );


      const tag =
        document.getElementById(
          "guildTag"
        );


      tag.textContent =
        guild.tag ||
        "";


      if (guild.badgeUrl) {

        badge.src =
          guild.badgeUrl;


        badge.onload =
          function () {

            badge.style.display =
              "block";

          };


        badge.onerror =
          function () {

            badge.style.display =
              "none";

          };

      }


      container.style.display =
        "flex";

    }


    /*
    ------------------------------------------
    Member since
    ------------------------------------------
    */

    if (profile.createdAt) {

      const date =
        new Date(
          profile.createdAt
        );


      document
        .getElementById(
          "memberSince"
        )
        .textContent =
        date.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric"
          }
        );

    }


  } catch (error) {

    console.error(
      "Profile error:",
      error
    );

  }

}


/*
|--------------------------------------------------------------------------
| Presence
|--------------------------------------------------------------------------
*/

async function loadPresence() {

  try {

    const response =
      await fetch(
        "/api/presence",
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Presence request failed"
      );

    }


    const presence =
      await response.json();


    const status =
      presence.status ||
      "offline";


    /*
    ------------------------------------------
    Status dot
    ------------------------------------------
    */

    const statusDot =
      document.getElementById(
        "statusDot"
      );


    const statusColor =
      statusColors[
        status
      ] ||
      statusColors.offline;


    statusDot.style.background =
      statusColor;


    statusDot.style.boxShadow =
      "0 0 18px " +
      statusColor;


    /*
    ------------------------------------------
    Status text
    ------------------------------------------
    */

    document
      .getElementById(
        "statusText"
      )
      .textContent =
      status
        .charAt(0)
        .toUpperCase() +
      status.slice(1);


    /*
    ------------------------------------------
    Activities
    ------------------------------------------
    */

    const activities =
      presence.activities ||
      [];


    if (activities.length > 0) {

      const activity =
        activities[0];


      let icon =
        "✨";


      switch (activity.type) {

        case 0:

          icon = "🎮";

          break;


        case 1:

          icon = "🔴";

          break;


        case 2:

          icon = "🎵";

          break;


        case 3:

          icon = "📺";

          break;


        case 4:

          icon = "💬";

          break;


        case 5:

          icon = "🏆";

          break;

      }


      document
        .getElementById(
          "activityIcon"
        )
        .textContent =
        icon;


      document
        .getElementById(
          "activityText"
        )
        .textContent =
        activity.details ||
        activity.state ||
        activity.name ||
        "Active";


    } else {

      document
        .getElementById(
          "activityIcon"
        )
        .textContent =
        "●";


      document
        .getElementById(
          "activityText"
        )
        .textContent =
        "No current activity";

    }


  } catch (error) {

    console.error(
      "Presence error:",
      error
    );

  }

}


/*
|--------------------------------------------------------------------------
| Initial load
|--------------------------------------------------------------------------
*/

loadProfile();

loadPresence();


/*
|--------------------------------------------------------------------------
| Live presence polling
|--------------------------------------------------------------------------
*/

setInterval(
  loadPresence,
  5000
);

</script>

</body>

</html>
  `);
});


/*
|--------------------------------------------------------------------------
| PROFILE API
|--------------------------------------------------------------------------
*/

router.get("/api/profile", async (req, res) => {

  try {

    if (!discordClient) {

      return res.status(503).json({

        error:
          "Discord client is not ready",

      });

    }


    const user =
      await discordClient.users.fetch(
        PROFILE_USER_ID,
        {
          force: true,
        }
      );


    /*
    |--------------------------------------------------------------------------
    | Accent Color
    |--------------------------------------------------------------------------
    |
    | Discord returns:
    |
    | accentColor: 1248041
    |
    | Convert decimal RGB to #RRGGBB.
    |
    */

    const accentColor =
      user.accentColor ?? null;


    const accentHex =
      accentColor !== null
        ? "#" +
          accentColor
            .toString(16)
            .padStart(6, "0")
        : null;


    /*
    |--------------------------------------------------------------------------
    | Avatar Decoration
    |--------------------------------------------------------------------------
    */

    let avatarDecorationData =
      null;


    if (
      user.avatarDecorationData &&
      user.avatarDecorationData.asset
    ) {

      const asset =
        user.avatarDecorationData.asset;


      avatarDecorationData = {

        asset,

        skuId:
          user.avatarDecorationData.skuId,

        url:
          "https://cdn.discordapp.com/" +
          "avatar-decoration-presets/" +
          encodeURIComponent(asset) +
          ".png?size=256",

      };

    }


    /*
    |--------------------------------------------------------------------------
    | Nameplate
    |--------------------------------------------------------------------------
    */

    let nameplate =
      null;


    if (
      user.collectibles &&
      user.collectibles.nameplate
    ) {

      nameplate = {

        skuId:
          user.collectibles.nameplate.skuId,

        asset:
          user.collectibles.nameplate.asset,

        label:
          user.collectibles.nameplate.label,

        palette:
          user.collectibles.nameplate.palette,

      };

    }


    /*
    |--------------------------------------------------------------------------
    | Primary Guild
    |--------------------------------------------------------------------------
    */

    let primaryGuild =
      null;


    if (user.primaryGuild) {

      const guild =
        user.primaryGuild;


      primaryGuild = {

        identityGuildId:
          guild.identityGuildId,

        identityEnabled:
          guild.identityEnabled,

        tag:
          guild.tag,

        badge:
          guild.badge,

        badgeUrl:
          guild.identityGuildId &&
          guild.badge

            ? "https://cdn.discordapp.com/" +
              "guild-tag-badges/" +
              encodeURIComponent(
                guild.identityGuildId
              ) +
              "/" +
              encodeURIComponent(
                guild.badge
              ) +
              ".png?size=64"

            : null,

      };

    }


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    res.json({

      /*
      Basic Discord user
      */

      id:
        user.id,

      username:
        user.username,

      globalName:
        user.globalName,

      discriminator:
        user.discriminator,

      bot:
        user.bot,


      /*
      Avatar
      */

      avatar:
        user.displayAvatarURL({
          extension: "png",
          size: 1024,
        }),


      /*
      Banner
      */

      banner:
        user.bannerURL({
          extension: "png",
          size: 2048,
        }),


      /*
      Accent
      */

      accentColor,

      accentHex,


      /*
      Account creation
      */

      createdAt:
        user.createdAt.toISOString(),


      /*
      Avatar decoration
      */

      avatarDecoration:
        user.avatarDecoration ||
        null,

      avatarDecorationData,


      /*
      Collectibles
      */

      collectibles: {

        nameplate,

      },


      /*
      Primary guild
      */

      primaryGuild,

    });


  } catch (error) {

    console.error(
      "MyProfile Discord fetch error:",
      error
    );


    res.status(500).json({

      error:
        "Failed to fetch Discord profile",

      message:
        error.message,

    });

  }

});


/*
|--------------------------------------------------------------------------
| PRESENCE API
|--------------------------------------------------------------------------
*/

router.get(
  "/api/presence",
  (req, res) => {

    res.json(
      profilePresence
    );

  }
);


/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

export default router;