package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a single chatting user.
type Client struct {
	hub *Hub
	// The websocket connection
	conn *websocket.Conn
	// Buffered channel of outbound messages
	send chan []byte
	// The user's unique ID
	uid string
	username string
}

// readPump pumps messages from the websoocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure){
				log.Printf("error: %v", err)
			}
			break
		}

		// 1. Parse the incoming JSON (Content + RecipientID)
		var incoming struct {
			Content	    string `json:"content"`
			RecipientID string `json:"recipientId"`
		}

		if err := json.Unmarshal(messageBytes, &incoming); err != nil {
			log.Printf("error unmarshaling message: %v", err)
			continue
		}

		// 2. Create the full Message object
		msg := &Message{
			SenderID: c.uid,
			SenderName: c.username,
			RecipientID: incoming.RecipientID,
			Content: incoming.Content,
			Timestamp: time.Now(),
		}

		// 3. Send to Hub
		c.hub.broadcast <- msg
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()

	for message := range c.send {
		c.conn.WriteMessage(websocket.TextMessage, message)
	}
}