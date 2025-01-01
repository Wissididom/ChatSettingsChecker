# Twitch-Chat-Settings-API

## Prerequisites

- Deno v2+
- Twitch Client ID
- Twitch Client Secret
- Port on the server where the GET request needs to be sent to

## Setup

1. Clone this repo
2. Do `npm i` or `npm install` to install `dotenv`, `express` and `helmet`
3. Copy `example.env` to `.env` and fill out it's values
4. Run `node index.js` or `npm start` and let it run in the background (Twitch sends a verification request after creating the EventSub subscription)
