import { Hono } from "hono";
import { getUser as getUserImpl } from "./utils.ts";
import process from "node:process";

const app = new Hono();

async function getChatSettings(
  token: { access_token: string },
  broadcasterId: string,
  moderatorId: string | undefined | null = null,
) {
  let url =
    `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}`;
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
    const json = await res.json();
    console.log(
      `${broadcasterId} - ${res.status}:\n${JSON.stringify(json, null, 2)}`,
    );
    return json;
  });
}

async function getUser(token: { access_token: string }, login: string) {
  return await getUserImpl(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
    login,
  );
}

async function getToken() {
  const clientCredentials = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );
  const clientCredentialsJson = await clientCredentials.json();
  if (clientCredentials.status >= 200 && clientCredentials.status < 300) {
    const token = {
      access_token: clientCredentialsJson.access_token,
      expires_in: clientCredentialsJson.expires_in,
      token_type: clientCredentialsJson.token_type,
    };
    return token;
  }
  console.log(clientCredentialsJson);
  return null;
}

app.get("/", async (c) => {
  const { channelName } = c.req.query();
  if (
    !channelName || channelName == "favicon.ico" || channelName == "favicon.png"
  ) {
    return c.text("Please specify a channelName!");
  }
  const token = await getToken();
  const user = await getUser(
    token,
    channelName.toLowerCase().replace(/@/g, ""),
  );
  if (!user) {
    return c.text("channel not found!");
  }
  const chatSettings = await getChatSettings(token, user.id);
  if (chatSettings.data && chatSettings.data.length > 0) {
    const data = chatSettings.data[0];
    const modes = [];
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
      return c.text(modes.join(" | "));
    } else {
      return c.text("All good, no restrictions detected!");
    }
  } else {
    return c.text("Failed to get chat settings!");
  }
});

const port = process.env.PORT || 3000;

Deno.serve({ port }, app.fetch);
