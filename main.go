package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sort"
	"sync"
)

var (
	scores []Score
	mutex  sync.Mutex
)

type Score struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Time  string `json:"time"`
	Rank  int    `json:"rank"`
}

func addScore(w http.ResponseWriter, r *http.Request) {
	var score Score
	err := json.NewDecoder(r.Body).Decode(&score)
	if err != nil {
		log.Println("Error decoding score:", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mutex.Lock()
	// Check if name already exists
	found := false
	for i := range scores {
		if scores[i].Name == score.Name {
			// Update existing score
			scores[i].Score = score.Score
			scores[i].Time = score.Time
			found = true
			break
		}
	}

	// If name doesn't exist, append new score
	if !found {
		scores = append(scores, score)
	}

	// Sort and update ranks
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Score > scores[j].Score
	})

	// Update ranks after sorting
	for i := range scores {
		scores[i].Rank = i + 1
	}
	mutex.Unlock()

	// Save scores to a JSON file
	saveScoresToFile()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(scores)
}

func getScores(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	json.NewEncoder(w).Encode(scores)
}

func saveScoresToFile() {
	file, err := os.Create("scores.json")
	if err != nil {
		println("Error creating scores file:", err)
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	encoder.Encode(scores)
}

func loadScoresFromFile() {
	file, err := os.Open("scores.json")
	if err != nil {
		println("No scores file found, starting fresh.")
		return
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	decoder.Decode(&scores)
}

func main() {
	// Load scores from file (if it exists)
	loadScoresFromFile()

	// Add CORS middleware
	http.HandleFunc("/api/scores", func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		switch r.Method {
		case http.MethodPost:
			addScore(w, r)
		case http.MethodGet:
			getScores(w, r)
		default:
			log.Println("Method not allowed:", r.Method)
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})

	println("Server started at http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
