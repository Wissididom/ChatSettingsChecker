package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type Token struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

type ChatSettingsData struct {
	BroadcasterID           string `json:"broadcaster_id"`
	EmoteMode               bool   `json:"emote_mode"`
	FollowerMode            bool   `json:"follower_mode"`
	FollowerModeDuration    int    `json:"follower_mode_duration"`
	SlowMode                bool   `json:"slow_mode"`
	SlowModeWaitTime        int    `json:"slow_mode_wait_time"`
	SubscriberMode          bool   `json:"subscriber_mode"`
	UniqueChatMode          bool   `json:"unique_chat_mode"`
	NonModeratorChatDelay   bool   `json:"non_moderator_chat_delay"`
	NonModeratorChatDelayMS int    `json:"non_moderator_chat_delay_ms"`
}

type ChatSettingsResponse struct {
	Data []ChatSettingsData `json:"data"`
}

type UserData struct {
	ID    string `json:"id"`
	Login string `json:"login"`
	Name  string `json:"display_name"`
}

type UserResponse struct {
	Data []UserData `json:"data"`
}

func getToken() (*Token, error) {
	clientID := os.Getenv("TWITCH_CLIENT_ID")
	clientSecret := os.Getenv("TWITCH_CLIENT_SECRET")

	url := fmt.Sprintf(
		"https://id.twitch.tv/oauth2/token?client_id=%s&client_secret=%s&grant_type=client_credentials",
		clientID, clientSecret,
	)

	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var token Token
	err = json.Unmarshal(body, &token)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		fmt.Printf("Error getting token: %s\n", string(body))
		return nil, fmt.Errorf("failed to get token, status: %d", resp.StatusCode)
	}

	return &token, nil
}

func getUser(token *Token, login string) (*UserData, error) {
	clientID := os.Getenv("TWITCH_CLIENT_ID")

	url := fmt.Sprintf("https://api.twitch.tv/helix/users?login=%s", login)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Client-ID", clientID)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userResp UserResponse
	err = json.Unmarshal(body, &userResp)
	if err != nil {
		return nil, err
	}

	if len(userResp.Data) == 0 {
		return nil, fmt.Errorf("user not found")
	}

	return &userResp.Data[0], nil
}

func getChatSettings(token *Token, broadcasterID string, moderatorID *string) (*ChatSettingsResponse, error) {
	clientID := os.Getenv("TWITCH_CLIENT_ID")

	url := fmt.Sprintf("https://api.twitch.tv/helix/chat/settings?broadcaster_id=%s", broadcasterID)
	if moderatorID != nil {
		url += fmt.Sprintf("&moderator_id=%s", *moderatorID)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Client-ID", clientID)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var chatSettings ChatSettingsResponse
	err = json.Unmarshal(body, &chatSettings)
	if err != nil {
		return nil, err
	}

	fmt.Printf("%s - %d:\n%s\n", broadcasterID, resp.StatusCode, string(body))

	return &chatSettings, nil
}

func handleRoot(c echo.Context) error {
	channelName := c.QueryParam("channelName")

	if channelName == "" || channelName == "favicon.ico" || channelName == "favicon.png" {
		return c.String(http.StatusOK, "Please specify a channelName!")
	}

	token, err := getToken()
	if err != nil {
		return c.String(http.StatusOK, "error getting token from twitch!")
	}

	cleanChannelName := strings.ToLower(strings.ReplaceAll(channelName, "@", ""))
	user, err := getUser(token, cleanChannelName)
	if err != nil {
		return c.String(http.StatusOK, "channel not found!")
	}

	chatSettings, err := getChatSettings(token, user.ID, nil)
	if err != nil {
		return c.String(http.StatusOK, "Failed to get chat settings!")
	}

	if chatSettings != nil && len(chatSettings.Data) > 0 {
		data := chatSettings.Data[0]
		var modes []string

		if data.EmoteMode {
			modes = append(modes, "emote-only-mode enabled")
		}
		if data.FollowerMode {
			modes = append(modes, fmt.Sprintf("%d minutes follower-only-mode enabled", data.FollowerModeDuration))
		}
		if data.SlowMode {
			modes = append(modes, fmt.Sprintf("%d seconds slow-mode enabled", data.SlowModeWaitTime))
		}
		if data.SubscriberMode {
			modes = append(modes, "subscriber-only-mode enabled")
		}
		if data.UniqueChatMode {
			modes = append(modes, "unique-chat-mode enabled")
		}

		if len(modes) > 0 {
			return c.String(http.StatusOK, strings.Join(modes, " | "))
		}
		return c.String(http.StatusOK, "All good, no restrictions detected!")
	}

	return c.String(http.StatusOK, "Failed to get chat settings!")
}

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.GET("/", handleRoot)

	portStr := os.Getenv("PORT")
	if portStr == "" {
		portStr = "3000"
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 3000
	}

	addr := net.JoinHostPort("", fmt.Sprintf("%d", port))
	e.Logger.Fatal(e.Start(addr))
}
