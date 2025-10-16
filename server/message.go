package main

import "time"

// A single message in the chat room.
type Message struct {
	SenderID string		`json:"senderId"`
	Content string		`json:"content"`
	Timestamp time.Time	`json:"timestamp"`
}