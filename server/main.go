package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/api/option"
)

// --- Structs and Global Variables ---
type User struct {
	ID    string `json:"id" bson:"_id"`
	Email string `json:"email" bson:"email"`
}

var mongoClient *mongo.Client
var firebaseAuth *auth.Client
var upgrader = websocket.Upgrader{
	// ReadBufferSize and WriteBufferSize specify I/O buffer sizes.
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
	// CheckOrigin is used to determine if the origin of the request is allowed.
	// For development, allow all origins.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
type contextKey string
const userContextKey = contextKey("user");

// serveWs handles, authenticates, and upgrades websocket requests.
func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request){
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}

	token, err := firebaseAuth.VerifyIDToken(context.Background(), tokenString)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	var user User
	collection := mongoClient.Database("onychat").Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = collection.FindOne(ctx, bson.M{"_id": token.UID}).Decode((&user))
	if err != nil {
		// Handle case where user is in Firebase Auth but not in our DB
		log.Printf("User %s not found in database", token.UID)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection for user %s: %v", token.UID, err)
		return
	}

	// Create a new client for this connection.
	client := &Client{
		hub: hub, 
		conn: conn, 
		send: make(chan []byte, 256), 
		uid: token.UID,
		username: user.Email,
	}
	client.hub.register <- client

	// Allow collection of memory referenced by the go routines.
	go client.writePump()
	go client.readPump()
}
// func serveWs(w http.ResponseWriter, r *http.Request) {
// 	// 1. Get the token from the query parameter
// 	tokenString := r.URL.Query().Get("token")
// 	if tokenString == "" {
// 		log.Println("Missing token in query parameters")
// 		http.Error(w, "Missing token", http.StatusUnauthorized)
// 		return
// 	}

// 	// 2. Verify token with Firebase
// 	token, err := firebaseAuth.VerifyIDToken(context.Background(), tokenString)
// 	if err != nil {
// 		log.Printf("Error verifying token: %v", err)
// 		http.Error(w, "Invalid token", http.StatusUnauthorized)
// 		return
// 	}

// 	log.Printf("New WebSocket connection attempt from user: %s", token.UID)

// 	// Upgrade the HTTP connection to a WebSocket connection
// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		log.Printf("Failed to upgrade connection for user %s: %v", token.UID, err)
// 		return
// 	}
// 	defer conn.Close()
// 	log.Printf("WebSocket connection established for user: %s", token.UID)

// 	// Simple echo loop for demonstration
// 	for {
// 		// Read message from client
// 		messageType, p, err := conn.ReadMessage()
// 		if err != nil {
// 			log.Printf("Read error: %v", err)
// 			break
// 		}

// 		log.Printf("Received message: %s", p)

// 		// Write the message back to the client (The Echo)
// 		if err := conn.WriteMessage(messageType, p); err != nil {
// 			log.Printf("Write error: %v", err)
// 			break
// 		}
// 	}
// 	log.Printf("WebSocket connection closed for user: %s", token.UID)
// }



// Protect routes middleware to verify Firebase ID tokens
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Get the Token from the Authorization header
		authHeadaer := r.Header.Get("Authorization")
		if authHeadaer == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return 
		}

		// The header should be in the format "Bearer <token>"
		idToken := strings.TrimPrefix(authHeadaer, "Bearer ")

		// 2. Verify the token with firebase
		token, err := firebaseAuth.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			log.Printf("Error verifying token: %v\n", err)
			http.Error(w, "Invalid authorization token", http.StatusUnauthorized)
			return
		}

		// 3. Add user info to the request context if needed
		ctx := context.WithValue(r.Context(), userContextKey, token)
		r = r.WithContext(ctx)

		// 4. If the token is valid, call the next handler
		next.ServeHTTP(w, r)
	}
}

// protected
func meHandler(w http.ResponseWriter, r *http.Request) {
	// Retrieve user token from context
	userToken, ok := r.Context().Value(userContextKey).(*auth.Token)
	if !ok {
		http.Error(w, "Could not retrieve user from context", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Welcome, authenticated user!",
		"uid": userToken.UID,
	})
}

// createUserHandler handles the POST request to create a new user
func createUserHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Received request to create user")
	w.Header().Set("Content-Type", "application/json")
	var user User
	// Decode the incoming JSON payload from the request body
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		respondWithError(w, http.StatusBadRequest, err)
		return
	}

	// Get a handle for the "users" collection
	collection := mongoClient.Database("onychat").Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Insert the user document into the collection
	_, err := collection.InsertOne(ctx, user)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err)
		return
	}

	log.Println("User created successfully.")
	// Respond with the created user
	json.NewEncoder(w).Encode(user)
}

func respondWithError(w http.ResponseWriter, code int, err error){
	// Log the detailed error on the server for debugging.
    log.Printf("HTTP %d - %s", code, err)

    // Send a generic, user-friendly error message to the client.
    // We avoid sending the raw error details to the client for security reasons.
    http.Error(w, http.StatusText(code), code)
}

func main() {
	// --- Environment and DB Setup ---
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Set up MongoDB connection
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		log.Fatal("MONGO_URI not set in environment")
	}

	var err error
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)
	mongoClient, err = mongo.Connect(context.TODO(), opts)
	if err != nil {
		log.Fatal(err)
	}
	defer mongoClient.Disconnect(context.TODO())

	log.Println("Connected to MongoDB!")

	// --- Initialize Firebase Admin SDK ---
	opt := option.WithCredentialsFile("serviceAccountKey.json")
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}
	firebaseAuth, err = app.Auth(context.Background())
	if err != nil {
		log.Fatalf("error getting Auth client: %v\n", err)
	}
	log.Println("Firebase Admin SDK initialized!")

	// --- Create and Run the Hub ---
	hub := newHub()
	go hub.run() // This starts the hub in a separate goroutine

	// --- Router Setup ---
	r := mux.NewRouter()
	// Public route for creating users
	r.HandleFunc("/api/users", createUserHandler).Methods("POST")
	// Protected route for getting user info
	r.HandleFunc("/api/me", authMiddleware(meHandler)).Methods("GET")
	// WebSocket endpoint
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request){
		serveWs(hub, w, r)
	})

	// Handle CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		Debug: 			  true,
	})

	handler := c.Handler(r)

	log.Println("Server starting on port 8080...")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatal(err)
	}
}