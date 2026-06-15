// Settings configuration
const urlParams = new URLSearchParams(window.location.search);
const alignRight = urlParams.get("alignRight") !== "false";
const sbAddress = urlParams.get("address") || "127.0.0.1";
const sbPort = urlParams.get("port") || "8080";

// Global Variables
let streamerbotConnected = false;
let tikfinityConnected = false;
let alertQueue = [];
let isAlertShowing = false;
const toastQueue = [];
let toastActive = false;
const twitch = "twitch";
const youtube = "youtube";
const kick = "kick";
const tiktok = "tiktok";
let socket; // Tikfinity Websocket

// ==================
// SOUND ALERT HELPER
// ==================

const SOUND_ALERT = {
  src: "assets/audio/Tuturu.mp3",
  volume: 0.05, // default volume (0.0 - 1.0)
};

// Preload sound
const soundAlert = new Audio(SOUND_ALERT.src);
soundAlert.preload = "auto";
soundAlert.volume = SOUND_ALERT.volume;

function playSoundAlert(volume = SOUND_ALERT.volume) {
  try {
    soundAlert.pause();
    soundAlert.currentTime = 0;

    soundAlert.volume = Math.max(0, Math.min(1, volume));

    const playPromise = soundAlert.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(err => {
        console.warn("Sound alert autoplay prevented:", err);
      });
    }
  } catch (err) {
    console.error("Sound alert failed:", err);
  }
}


// ========================
// Connect to Streamer.bot
// ========================
const client = new StreamerbotClient({
  host: sbAddress,
  port: sbPort,

  onConnect: (data) => {
    if (!streamerbotConnected) {
      streamerbotConnected = true;
      console.log(`✅ Streamer.bot connected to ${sbAddress}:${sbPort}`)
      console.debug(data);
      showSuccess("streamerbot");
      updateStatus();
    }
  },

  onDisconnect: () => {
    if (streamerbotConnected) {
      streamerbotConnected = false;
      console.warn("❌ Streamer.bot disconnected");
      showDisconnect("streamerbot")
      updateStatus();
    }
  }
});

// ==========================
// Streamer.bot Event Handler
// ==========================
client.on('Twitch.Follow', async (data) => {
  console.log('📢 New Twitch Follower:', data);

  const avatarUrl = await getTwitchAvatar(data.data.user_login);

  queueBubbleAlerts(
    avatarUrl,
    twitch,
    data.data.user_name,
    "спасибо за подписку!"
  );
});

client.on('YouTube.NewSubscriber', (data) => {
  console.log('📢 New YouTube Subscriber:', data);

  queueBubbleAlerts(
    data.data.avatar,
    youtube,
    data.data.username,
    "спасибо за подписку!"
  );
});

client.on('Kick.Follow', async (data) => {
  console.log('📢 New Kick Follower:', data);

  const profilePicUrl = await getKickProfilePic(data.data.user.login);

  queueBubbleAlerts(
    profilePicUrl,
    kick,
    data.data.user.name,
    "спасибо за подписку!"
  );
});

// =====================
// Connect to TikFinity
// =====================
function connectTikFinity() {
  socket = new WebSocket("ws://localhost:21213");

  // Successful connection
  socket.onopen = () => {
    console.log("✅ Connected to TikFinity");
    tikfinityConnected = true;
    showSuccess("tikfinity");
    updateStatus();
  };

  // Disconnected or failed
  socket.onclose = () => {
    if (tikfinityConnected) {
      console.warn("❌ Disconnected from TikFinity");
      tikfinityConnected = false;
      showDisconnect("tikfinity");
      updateStatus();
    }

    // Try reconnecting after 10 seconds
    setTimeout(connectTikFinity, 10000);
  };

  // Connection Error
  socket.onerror = (err) => {
    console.error("TikFinity WebSocket error:", err);
  };

  // Event handler (calls the TikTok event handler function below)
  socket.onmessage = tiktokEvents;
}

// =====================
// TikTok Event Handler
// =====================
function tiktokEvents(event) {
  try {
    const data = JSON.parse(event.data);
    const eventSource = data.event;
    const payload = data.data;

    // Map event types to messages
    // [event]: [bubble message]
    const messages = {
      follow: "спасибо за подписку!",
      // chat: payload.comment,
    };

    if (messages[eventSource]) {
      console.log(`${eventSource} event from ${payload.nickname || payload.uniqueId}`);
      queueBubbleAlerts(
        payload.profilePictureUrl,
        tiktok,
        payload.nickname,
        messages[eventSource]
      );
      console.debug(`${payload.nickname || payload.uniqueId} спасибо за подписку!`)
    }
  } catch (err) {
    console.error("Failed to process TikFinity event:", err);
  }
}


// ======================
// UI: Update Wait Status
// ======================
function updateStatus() {
  const waitingEl = document.getElementById("waiting-status");

  if (streamerbotConnected || tikfinityConnected) {
    waitingEl.classList.add("fade-out");
    setTimeout(() => waitingEl.classList.add("hidden"), 1000); // hide after fade
  } else {
    waitingEl.classList.remove("hidden", "fade-out");
  }
}


function showSuccess(source) {
  queueToast(`${source}-status`);
}

function showDisconnect(source) {
  queueToast(`${source}-disconnect-status`);
}

// ===============================
// UI: Main Bubble Alerts Function
// ===============================
function runBubbleAlerts(avatarUrl, platform, usernameText = "", messageText = "") {
  const container = document.getElementById("alert-container");

  // Clean up any leftover slide-out animations from previous alerts
  container.classList.remove("slide-out-left", "slide-out-right");

  // Configurable timings
  const speechPopDelay = 300;  // ms after platform bubble pop-in
  const speechHoldTime = 3000; // ms to stay visible before shrinking
  const speechAnimDuration = 300; // matches CSS transition

  // Set layout class
  container.classList.remove("layout-left", "layout-right");
  container.classList.add(alignRight ? "layout-right" : "layout-left");

  // Fill existing elements
  container.querySelector(".avatar-image").src = avatarUrl;
  container.querySelector(".platform-logo").src =
    {
      twitch: "assets/images/twitch-logo.png",
      youtube: "assets/images/youtube-logo.png",
      kick: "assets/images/kick-logo.png",
      tiktok: "assets/images/tiktok-logo.png",
    }[platform] || "assets/default.png";

  container.querySelector(".bubble-username").textContent = usernameText;
  container.querySelector(".bubble-message").textContent = messageText;

  // Show the alert container
  container.classList.remove("hidden");

  // Reset platform bubble state
  const bubble = container.querySelector(".platform-bubble");
  bubble.classList.remove(
    "bubble-pop-in",
    "platform-bubble-pop-out-left",
    "platform-bubble-pop-out-right",
    "platform-bubble-pop-in-left",
    "platform-bubble-pop-in-right"
  );

  bubble.className = `platform-bubble platform-bubble-${platform}`;
  bubble.style.backgroundColor = "";

  // Reset speech bubble state
  const speechBubble = container.querySelector(".speech-bubble");
  speechBubble.className = "speech-bubble";
  speechBubble.style.transform = "scale(0)";
  speechBubble.style.opacity = "0";

  // Animate avatar-wrapper first, but only after image is loaded
  const avatarWrapper = container.querySelector(".avatar-wrapper");
  const avatarImage = container.querySelector(".avatar-image");

  // Don't hide immediately — keep whatever is there until the new one is ready
  avatarWrapper.classList.remove("avatar-in");

  const tempImg = new Image();
  tempImg.onload = () => {
    avatarImage.src = avatarUrl;

    // Use requestAnimationFrame twice to ensure browser has painted new image
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        avatarWrapper.classList.add("avatar-in");
      });
    });
  };

  tempImg.src = avatarUrl;

  // When avatar-wrapper pop-in ends, trigger platform-bubble pop-in
  avatarWrapper.addEventListener(
    "animationend",
    () => {
      bubble.classList.add("bubble-pop-in");
      playSoundAlert();
      
      // Wait a bit, then pop in speech bubble
      setTimeout(() => {

  
        // Remove pop in the fade out towards the speech bubble's direction
        bubble.classList.remove("bubble-pop-in");
        if (alignRight) {
            bubble.classList.add("platform-bubble-pop-out-left");
          } else {
            bubble.classList.add("platform-bubble-pop-out-right");
          }

        speechBubble.style.transform = "scale(1)";
        speechBubble.style.opacity = "1";
              
        // Hold, then shrink
        setTimeout(() => {
          
          // Speech bubble shrinks
          speechBubble.style.transform = "scale(0)";
          speechBubble.style.opacity = "0";
          
          // Bubble pops back in
          if (alignRight) {
            bubble.classList.remove("platform-bubble-pop-out-left");
            bubble.classList.add("platform-bubble-pop-in-right");
          } else {
            bubble.classList.remove("platform-bubble-pop-out-right");
            bubble.classList.add("platform-bubble-pop-in-left");
          }

          // After shrink animation, hide container
          setTimeout(() => {
            // Choose slide-out direction based on alignment
            const slideOutClass = alignRight ? "slide-out-right" : "slide-out-left";
            container.classList.add(slideOutClass);

            // Wait for slide-out animation to finish
            container.addEventListener(
              "animationend",
              () => {
                container.classList.remove(slideOutClass);
                container.classList.add("hidden");
                setTimeout(() => {
                  playNextAlert();
                }, 500);
              },
              { once: true }
            );
          }, speechAnimDuration);
        }, speechHoldTime);

      }, speechPopDelay);
    },
    { once: true }
  );
}

// ===============
// QUEUEING SYSTEM
// ===============
function queueBubbleAlerts(avatarUrl, platform, usernameText, messageText) {
  alertQueue.push({ avatarUrl, platform, usernameText, messageText});
  if (!isAlertShowing) {
    playNextAlert();
  }
}

function playNextAlert() {
  if (alertQueue.length === 0) {
    isAlertShowing = false;
    return;
  }

  isAlertShowing = true;
  const { avatarUrl, platform, usernameText, messageText } = alertQueue.shift();

  // Pass a callback that waits 500ms before starting the next alert
  runBubbleAlerts(avatarUrl, platform, usernameText, messageText);
}

function queueToast(elementId) {
  toastQueue.push(elementId);
  if (!toastActive) {
    showNextToast();
  }
}

function showNextToast() {
  if (toastQueue.length === 0) {
    toastActive = false;
    return;
  }

  toastActive = true;
  const id = toastQueue.shift();
  const el = document.getElementById(id);
  if (!el) {
    showNextToast();
    return;
  }

  el.classList.remove("hidden", "fade-out");

  // Show for 1 second, fade out, then wait a bit before showing the next one
  setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => {
      el.classList.add("hidden");
      showNextToast();
    }, 500); // wait for fade animation to finish
  }, 1000);
}

// ================
// HELPER FUNCTIONS
// ================
async function getTwitchAvatar(username) {
  const url = `https://decapi.me/twitch/avatar/${encodeURIComponent(username)}`;

  try {
    const response = await fetch(url);
    return await response.text();

  } catch (err) {
    console.error(`[getTwitchAvatar] Error fetching avatar for "${username}": ${err.message}`);
    return "assets/images/twitch-logo.png"; // fallback image
  }
}

async function getKickProfilePic(username) {
  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${username}`);
    const data = await response.json();
    let profilePicUrl = data.user?.profile_pic || null;

    if (profilePicUrl) {
      // Replace 'fullsize' with 'medium'
      profilePicUrl = profilePicUrl.replace("fullsize", "medium");
    }
    return profilePicUrl;

  } catch (err) {
    console.error("Error fetching Kick profile picture:", err);
    return null;
  }
}

// ==========
// TEST DATA 
// ==========
const testData = [
  {
    avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/92a3c6c7-3b13-4563-9725-d56a3bc12c0d-profile_image-300x300.png",
    platform: "twitch",
    username: "CoolStreamer",
    message: "Thanks for the awesome stream!",
  },
  {
    avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/0824d209-43be-4faa-9fbf-f66c63e84cb9-profile_image-300x300.png",
    platform: "youtube",
    username: "KingJAMES 🐐",
    message: "This is a really long message to see if the ellipsis kicks in properly...",
  },
  {
    avatarUrl: "https://files.kick.com/images/user/4377088/profile_image/conversion/dae5ceec-5b25-4f26-82c2-e2fdc98ae958-fullsize.webp",
    platform: "kick",
    username: "KickUser",
    message: "Hi!",
  },
  {
    avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/469c5f1d-8177-4767-8bbc-73ef81818f38-profile_image-70x70.png",
    platform: "tiktok",
    username: "TheLastRealCHAMP",
    message: "Loving the vibes in here 😎🔥",
  }
];

let testIndex = 0;

// Sequential test loop
function startTestLoop() {
  setInterval(() => {
    const data = testData[testIndex];
    queueBubbleAlerts(
      data.avatarUrl,
      data.platform,
      data.username,
      data.message,
    );

    testIndex = (testIndex + 1) % testData.length; // cycle through
  }, 3000); // cycle duration
}

// Start connection loops
connectTikFinity();

// Start test loop instead of one-time call
// startTestLoop();



