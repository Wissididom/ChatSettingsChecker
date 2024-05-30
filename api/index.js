import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { getUser as getUserImpl } from "../utils.js";

const app = express();

async function getChatSettings(token, broadcasterId, moderatorId = null) {
  let url = `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}`;
  if (moderatorId) {
    url += `&moderator_id=${moderatorId}`;
  }
  return await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
  }).then(async (res) => {
    // 200 OK = Successfully sent the message
    // 400 Bad Request
    // 401 Unauthorized
    let json = await res.json();
    console.log(
      `${broadcasterId} - ${res.status}:\n${JSON.stringify(json, null, 2)}`,
    );
    return json;
  });
}

async function getUser(token, login) {
  return getUserImpl(process.env.TWITCH_CLIENT_ID, token.access_token, login);
}

async function getToken() {
  let clientCredentials = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );
  let clientCredentialsJson = await clientCredentials.json();
  if (clientCredentials.status >= 200 && clientCredentials.status < 300) {
    let token = {
      access_token: clientCredentialsJson.access_token,
      expires_in: clientCredentialsJson.expires_in,
      token_type: clientCredentialsJson.token_type,
    };
    return token;
  }
  console.log(clientCredentialsJson);
  return null;
}

app.use(helmet());

app.use(
  express.raw({
    type: "application/json",
  }),
);

app.get("/", async (req, res) => {
  res.send("Please specify a channel name");
});

app.get("/:channelName", async (req, res, next) => {
  if (!req.params.channelName || req.params.channelName == "favicon.ico")
    next();
  let token = await getToken();
  let userId = (await getUser(token, req.params.channelName.toLowerCase())).id;
  let chatSettings = await getChatSettings(token, userId);
  if (chatSettings.data && chatSettings.data.length > 0) {
    let data = chatSettings.data[0];
    let modes = [];
    if (data.emote_mode) {
      modes.push(`emote-only-mode enabled`);
    }
    if (data.follower_mode) {
      modes.push(
        `${data.follower_mode_duration} minutes follower-only-mode enabled`,
      );
    }
    // Non-Mod-Chat-Delay if a moderator would have been specified and the app would have had the moderator:read:chat_settings scope
    if (data.slow_mode) {
      modes.push(`${data.slow_mode_wait_time} seconds slow-mode enabled`);
    }
    if (data.subscriber_mode) {
      modes.push(`subscriber-only-mode enabled`);
    }
    if (data.unique_chat_mode) {
      modes.push(`unique-chat-mode enabled`);
    }
    if (modes.length > 0) {
      res.send(modes.join(" | "));
    } else {
      res.send("All good, no restrictions detected!");
    }
  } else {
    res.send("Failed to get chat settings!");
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server ready on port ${port}.`));

export default app;
