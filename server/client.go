package main

import (
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
}

// readPump pumps messages from the websoocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, messageContent, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure){
				log.Printf("error: %v", err)
			}
			break
		}

		msg := &Message{
			SenderID: c.uid,	
			Content: string(messageContent),
			Timestamp: time.Now(),
		}

		// When a messsage is received, it is sent to the hub's broadcast channel
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