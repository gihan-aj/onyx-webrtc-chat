package main

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	// Registered clients
	clients map[*Client]bool
	// Inbound messages from the clients
	broadcast chan *Message
	// Register requests from the clients
	register chan *Client
	// Unregister requests from clients
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast: make(chan *Message),
		register: make(chan *Client),
		unregister: make(chan *Client),
		clients: make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			collection := mongoClient.Database("onychat").Collection("messages")
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			_, err := collection.InsertOne(ctx, message)
			if err != nil {
				log.Printf("failed to insert message to mongo: %v", err)
			}
			cancel()

			// Marshal the message object to JSON
			messageJSON, err := json.Marshal(message)
			if err != nil {
				log.Printf("error marshaling message: %v", err)
				continue
			}
			for client := range h.clients {
				select {
				case client.send <- messageJSON:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}