# Twitch-Chat-Settings-API

## Prerequisites

- NodeJS v18+
- Twitch Client ID
- Twitch Client Secret
- Port on the server where the GET request needs to be sent to
  - only matters for installation on your server; doesn't matter for deployments on Vercel

## Setup

### Hosted on your server

1. Clone this repo
2. Do `npm i` or `npm install` to install `dotenv`, `express` and `helmet`
3. Copy `example.env` to `.env` and fill out it's values
4. Run `node get-chatter-access.js` and authorize with the account that should send the message
5. Run `node get-streamer-access.js` and authorize with the account of the streamer in whose channel you want to send the message
6. Run `node api/index.js` or `npm start` and let it run in the background (Twitch sends a verification request after creating the EventSub subscription)

### Hosted on Vercel

1. Fork this repo
2. Import your Fork to Vercel
3. Create the environment variables from `example.env` on Vercel's settings page
4. Redeploy to make sure Vercel uses those environment variables
5. Do step 4, 5 and 7 from the `Hosted on your server` section locally with the same values that you have specified on Vercel as environment variables
