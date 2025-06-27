package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/your-project/clients"
)

func main() {
	// Check for API key
	apiKey := os.Getenv("AVIATION_EDGE_API_KEY")
	if apiKey == "" {
		fmt.Println("Warning: AVIATION_EDGE_API_KEY environment variable is not set.")
		fmt.Println("Loading from .env file if available.")
	} else {
		fmt.Println("API Key is set in environment variables.")
	}

	// Initialize APIs
	aircraftAPI := clients.NewAircraftAPI()
	flightsAPI := clients.NewFlightsAPI()

	// Fetch aircraft data
	fmt.Println("\nFetching aircraft data...")
	aircraft, err := aircraftAPI.GetAircraft(map[string]string{
		"limit": "10",
	})
	if err != nil {
		log.Fatalf("Error fetching aircraft: %v", err)
	}
	fmt.Printf("Fetched %d aircraft\n", len(aircraft))

	// Fetch flight data
	fmt.Println("\nFetching flight data...")
	flights, err := flightsAPI.GetFlights(map[string]string{
		"depIata": "JFK",
		"limit":   "10",
	})
	if err != nil {
		log.Fatalf("Error fetching flights: %v", err)
	}
	fmt.Printf("Fetched %d flights\n", len(flights))

	// Fetch future flights
	fmt.Println("\nFetching future flights data...")
	futureFlights, err := flightsAPI.GetFutureFlights(map[string]string{
		"iataCode": "LAX",
		"date":     time.Now().AddDate(0, 0, 7).Format("2006-01-02"),
		"type":     "departure",
	})
	if err != nil {
		log.Fatalf("Error fetching future flights: %v", err)
	}
	fmt.Printf("Fetched %d future flights\n", len(futureFlights))

	// Combine all data
	combinedData := map[string]interface{}{
		"aircraft":      aircraft,
		"flights":       flights,
		"futureFlights": futureFlights,
	}

	// Save to file
	saveDataToFile(combinedData, "test-data.json")
	fmt.Println("Data saved to test-data.json")

	// Check if data is empty
	if isDataEmpty(combinedData) {
		fmt.Println("\nWARNING: The saved data contains empty structures.")
		fmt.Println("This could be because:")
		fmt.Println("1. The API key is not set or is invalid")
		fmt.Println("2. The API endpoints are not returning real data")
		fmt.Println("3. The API returned empty data for the given parameters")
		fmt.Println("\nTo get real data, make sure the .env file in the clients directory contains a valid AVIATION_EDGE_API_KEY.")
	}
}

func saveDataToFile(data interface{}, filename string) {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling  %v", err)
	}

	if err := os.WriteFile(filename, jsonData, 0644); err != nil {
		log.Fatalf("Error writing file: %v", err)
	}
}

func isDataEmpty(data map[string]interface{}) bool {
	// Check if aircraft data is empty
	if aircraft, ok := data["aircraft"].([]clients.Aircraft); ok {
		for _, a := range aircraft {
			if a.AirplaneID != "" || a.NumberRegistration != "" {
				return false
			}
		}
	}

	// Check if flights data is empty
	if flights, ok := data["flights"].([]clients.Flight); ok {
		for _, f := range flights {
			if f.Status != "" || f.Flight.Number != "" {
				return false
			}
		}
	}

	// Check if futureFlights data is empty
	if futureFlights, ok := data["futureFlights"].([]clients.Flight); ok {
		for _, f := range futureFlights {
			if f.Status != "" || f.Flight.Number != "" {
				return false
			}
		}
	}

	return true
}

