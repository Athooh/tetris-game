package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"sync"
)

// Score represents a player's score, name, and time.
type Score struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Time  string `json:"time"`
	Rank  int    `json:"rank"`
}

type ScoreResponse struct {
	Scores      []Score `json:"scores"`
	TotalPages  int     `json:"totalPages"`
	CurrentPage int     `json:"currentPage"`
}

const (
	scoresFile    = "scores.json"
	scoresPerPage = 5
)

var (
	scores []Score
	mutex  = &sync.Mutex{}
)

// loadScores loads scores from the JSON file
func loadScores() error {
	mutex.Lock()
	defer mutex.Unlock()

	// Create file if it doesn't exist
	if _, err := os.Stat(scoresFile); os.IsNotExist(err) {
		scores = []Score{}
		return saveScores()
	}

	data, err := os.ReadFile(scoresFile)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &scores)
}

// saveScores saves scores to the JSON file
func saveScores() error {
	data, err := json.MarshalIndent(scores, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(scoresFile, data, 0644)
}

// submitScore handles POST requests to submit a new score.
func submitScore(w http.ResponseWriter, r *http.Request) {
	var score Score
	err := json.NewDecoder(r.Body).Decode(&score)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mutex.Lock()
	// Check for duplicate entry (same name, score, and time)
	isDuplicate := false
	for _, s := range scores {
		if s.Name == score.Name && s.Score == score.Score && s.Time == score.Time {
			isDuplicate = true
			break
		}
	}

	if !isDuplicate {
		scores = append(scores, score)
		sort.Slice(scores, func(i, j int) bool {
			return scores[i].Score > scores[j].Score
		})

		// Update ranks
		for i := range scores {
			scores[i].Rank = i + 1
		}

		// Save to file
		err = saveScores()
	}
	mutex.Unlock()

	if isDuplicate {
		http.Error(w, "Duplicate score entry", http.StatusConflict)
		return
	}

	if err != nil {
		http.Error(w, "Error saving scores", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(score)
}

// getScores handles GET requests to retrieve the top 5 scores.
func getScores(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	mutex.Lock()
	totalPages := (len(scores) + scoresPerPage - 1) / scoresPerPage

	start := (page - 1) * scoresPerPage
	end := start + scoresPerPage
	if end > len(scores) {
		end = len(scores)
	}

	var pageScores []Score
	if start < len(scores) {
		pageScores = scores[start:end]
	} else {
		pageScores = []Score{}
	}
	mutex.Unlock()

	response := ScoreResponse{
		Scores:      pageScores,
		TotalPages:  totalPages,
		CurrentPage: page,
	}

	// Respond with the top scores
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleScores routes POST and GET requests to the appropriate functions.
func handleScores(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.Method {
	case http.MethodPost:
		submitScore(w, r)
	case http.MethodGet:
		getScores(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func main() {
	// Load existing scores on startup
	if err := loadScores(); err != nil {
		log.Printf("Error loading scores: %v", err)
	}

	// Set up the API endpoint
	http.HandleFunc("/api/scores", handleScores)

	// Start the server
	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
