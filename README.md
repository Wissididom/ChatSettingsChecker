# Archived

Please consider using https://github.com/Wissididom/WissididomApi instead.

# Twitch Chat Settings API

A Go application that fetches Twitch chat settings for a specified channel.

## Prerequisites

- Go 1.23+
- Twitch Client ID
- Twitch Client Secret
- Port on the server where the GET request needs to be sent to

## Setup

1. Clone this repo
2. Copy `example.env` to `.env` and fill out its values
3. Run `go mod tidy` to install dependencies
4. Run `go build -o chat-settings-checker main.go` to build the binary
5. Run `./chat-settings-checker` and let it run in the background

Or use the Makefile:
- `make build` - Build the binary
- `make run` - Run the application
- `make dev` - Run with race detector
- `make clean` - Clean build artifacts
- `make docker-build` - Build Docker image
- `make docker-run` - Run in Docker

## Docker

Build and run with Docker:
```bash
docker build -t chat-settings-checker:latest .
docker run -p 3000:3000 --env-file .env chat-settings-checker:latest
```

## API Usage

```bash
curl "http://localhost:3000/?channelName=YOUR_CHANNEL_NAME"
```

Returns a string describing the active chat restrictions, or "All good, no restrictions detected!" if none are active.
