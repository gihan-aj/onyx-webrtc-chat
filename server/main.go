package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// User struct defines the data model for the user in MongoDB
type User struct {
	ID 	  string `json:"id" bson:"_id"` // Using firebase UID as the ID
	Email string `json:"email" bson:"email"`
}

var client *mongo.Client

// createUserHandler handles the POST request to create a new user
func createUserHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var user User
	// Decode the incoming JSON payload from the request body
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get a handle for the "users" collection
	collection := client.Database("onychat").Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Insert the user document into the collection
	_, err := collection.InsertOne(ctx, user)
	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Respond with the created user
	json.NewEncoder(w).Encode(user)
}

func main() {
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
	client, err = mongo.Connect(context.TODO(), opts)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.TODO())

	log.Println("Connected to MongoDB!")

	// Set up router
	r := mux.NewRouter()
	r.HandleFunc("/api/users", createUserHandler).Methods("POST")

	// Handle CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
	})

	handler := c.Handler(r)

	log.Println("Server starting on port 8080...")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatal(err)
	}
}