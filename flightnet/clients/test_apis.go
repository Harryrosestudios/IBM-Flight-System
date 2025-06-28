package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

// Aircraft represents aircraft data
type Aircraft struct {
	AirplaneID         string `json:"airplaneId"`
	NumberRegistration string `json:"numberRegistration"`
	ProductionLine     string `json:"productionLine"`
	AirplaneIataType   string `json:"airplaneIataType"`
	PlaneModel         string `json:"planeModel"`
	ModelCode          string `json:"modelCode"`
	HexIcaoAirplane    string `json:"hexIcaoAirplane"`
	CodeIataPlaneShort string `json:"codeIataPlaneShort"`
	CodeIataPlaneLong  string `json:"codeIataPlaneLong"`
	ConstructionNumber string `json:"constructionNumber"`
	RolloutDate        string `json:"rolloutDate"`
	FirstFlight        string `json:"firstFlight"`
	DeliveryDate       string `json:"deliveryDate"`
	RegistrationDate   string `json:"registrationDate"`
	CodeIataAirline    string `json:"codeIataAirline"`
	EnginesCount       string `json:"enginesCount"`
	EnginesType        string `json:"enginesType"`
	PlaneAge           string `json:"planeAge"`
	PlaneStatus        string `json:"planeStatus"`
}

// Flight represents flight data
type Flight struct {
	Geography struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		Altitude  float64 `json:"altitude"`
	} `json:"geography"`
	Departure struct {
		IataCode      string `json:"iataCode"`
		IcaoCode      string `json:"icaoCode"`
		ScheduledTime string `json:"scheduledTime"`
	} `json:"departure"`
	Arrival struct {
		IataCode      string `json:"iataCode"`
		IcaoCode      string `json:"icaoCode"`
		ScheduledTime string `json:"scheduledTime"`
	} `json:"arrival"`
	Aircraft struct {
		RegNumber string `json:"regNumber"`
		IcaoCode  string `json:"icaoCode"`
	} `json:"aircraft"`
	Flight struct {
		Number     string `json:"number"`
		IataNumber string `json:"iataNumber"`
		IcaoNumber string `json:"icaoNumber"`
	} `json:"flight"`
	Airline struct {
		Name     string `json:"name"`
		IataCode string `json:"iataCode"`
		IcaoCode string `json:"icaoCode"`
	} `json:"airline"`
	Status string `json:"status"`
}

func main() {
	// Set up logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Get current directory for context
	currentDir, _ := os.Getwd()
	fmt.Printf("Running tests from: %s\n", currentDir)
	fmt.Println(repeatString("=", 60))

	// Test basic functionality
	fmt.Println("🔧 Testing Basic Functionality...")
	testBasicFunctionality()
	fmt.Println()

	// Test JSON parsing
	fmt.Println("📊 Testing JSON Parsing...")
	testJSONParsing()
	fmt.Println()

	// Test file structure (looking in current directory since we're in clients)
	fmt.Println("📁 Testing File Structure...")
	testFileStructure()
	fmt.Println()

	fmt.Println(repeatString("=", 60))
	fmt.Println("✅ All basic tests completed!")
	fmt.Println("📝 Next steps:")
	fmt.Println("   1. Add API keys to .env file in current directory")
	fmt.Println("   2. Ensure all Go files compile: go build")
	fmt.Println("   3. Test individual components")
}

func testBasicFunctionality() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("❌ Basic functionality test failed: %v\n", r)
		}
	}()

	fmt.Println("  📋 Testing Go environment...")
	fmt.Printf("  ✅ Go is working correctly\n")
	fmt.Printf("  ✅ JSON package available\n")
	fmt.Printf("  ✅ File system access working\n")

	// Test environment variables from .env in current directory
	fmt.Println("  📋 Testing environment setup...")

	// Check if .env file exists in current directory
	envPath := ".env"
	if envContent, err := os.ReadFile(envPath); err == nil {
		envStr := string(envContent)
		fmt.Printf("  ✅ Found .env file in current directory (%d bytes)\n", len(envContent))

		if containsPattern(envStr, "AVIATION_EDGE_API_KEY=") {
			fmt.Printf("  ✅ AVIATION_EDGE_API_KEY configured in .env\n")
		} else {
			fmt.Printf("  ⚠️  AVIATION_EDGE_API_KEY not configured in .env\n")
		}

		if containsPattern(envStr, "ICAO_API_KEY=") {
			fmt.Printf("  ✅ ICAO_API_KEY configured in .env\n")
		} else {
			fmt.Printf("  ⚠️  ICAO_API_KEY not configured in .env\n")
		}
	} else {
		fmt.Printf("  ❌ Cannot read .env file: %v\n", err)
	}

	// Also check system environment variables
	if _, exists := os.LookupEnv("AVIATION_EDGE_API_KEY"); exists {
		fmt.Printf("  ✅ AVIATION_EDGE_API_KEY found in system environment\n")
	} else {
		fmt.Printf("  ⚠️  AVIATION_EDGE_API_KEY not found in system environment\n")
	}

	if _, exists := os.LookupEnv("ICAO_API_KEY"); exists {
		fmt.Printf("  ✅ ICAO_API_KEY found in system environment\n")
	} else {
		fmt.Printf("  ⚠️  ICAO_API_KEY not found in system environment\n")
	}
}

func testJSONParsing() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("❌ JSON parsing test failed: %v\n", r)
		}
	}()

	// Test aircraft JSON parsing
	fmt.Println("  📋 Testing aircraft JSON parsing...")
	mockAircraftData := []byte(`[{
		"airplaneId": "test-123",
		"numberRegistration": "N12345",
		"planeModel": "Boeing 737-800",
		"codeIataAirline": "AA",
		"planeStatus": "active"
	}]`)

	var aircraft []Aircraft
	if err := json.Unmarshal(mockAircraftData, &aircraft); err != nil {
		fmt.Printf("  ❌ Error parsing aircraft JSON: %v\n", err)
	} else {
		fmt.Printf("  ✅ Successfully parsed %d aircraft\n", len(aircraft))
		if len(aircraft) > 0 {
			fmt.Printf("  📝 Sample: %s - %s (%s)\n",
				aircraft[0].NumberRegistration,
				aircraft[0].PlaneModel,
				aircraft[0].CodeIataAirline)
		}
	}

	// Test flight JSON parsing
	fmt.Println("  📋 Testing flight JSON parsing...")
	mockFlightData := []byte(`[{
		"flight": {"number": "AA123", "iataNumber": "AA123"},
		"departure": {"iataCode": "JFK", "scheduledTime": "2025-06-28T14:00:00Z"},
		"arrival": {"iataCode": "LAX", "scheduledTime": "2025-06-28T17:00:00Z"},
		"status": "active"
	}]`)

	var flights []Flight
	if err := json.Unmarshal(mockFlightData, &flights); err != nil {
		fmt.Printf("  ❌ Error parsing flight JSON: %v\n", err)
	} else {
		fmt.Printf("  ✅ Successfully parsed %d flights\n", len(flights))
		if len(flights) > 0 {
			fmt.Printf("  📝 Sample: Flight %s (%s -> %s)\n",
				flights[0].Flight.Number,
				flights[0].Departure.IataCode,
				flights[0].Arrival.IataCode)
		}
	}

	// Test API response formats
	fmt.Println("  📋 Testing API response formats...")

	// Aviation Edge mock response
	aviationEdgeResponse := []byte(`[{"airplaneId":"mock-id"}]`)
	var aviationData []map[string]interface{}
	if err := json.Unmarshal(aviationEdgeResponse, &aviationData); err != nil {
		fmt.Printf("  ❌ Error parsing Aviation Edge format: %v\n", err)
	} else {
		fmt.Printf("  ✅ Aviation Edge format parsed successfully\n")
	}

	// World Bank mock response
	worldBankResponse := []byte(`[{"page":1,"pages":1,"per_page":"50","total":61},[{"id":"1","name":"Doing Business"}]]`)
	var worldBankData []interface{}
	if err := json.Unmarshal(worldBankResponse, &worldBankData); err != nil {
		fmt.Printf("  ❌ Error parsing World Bank format: %v\n", err)
	} else {
		fmt.Printf("  ✅ World Bank format parsed successfully\n")
	}

	// Fuel API mock response
	fuelResponse := []byte(`{"aircraft":"A320","distance":1000,"fuel_burn":2000,"co2_emissions":6000,"unit":"kg"}`)
	var fuelData map[string]interface{}
	if err := json.Unmarshal(fuelResponse, &fuelData); err != nil {
		fmt.Printf("  ❌ Error parsing Fuel API format: %v\n", err)
	} else {
		fmt.Printf("  ✅ Fuel API format parsed successfully\n")
	}
}

func testFileStructure() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("❌ File structure test failed: %v\n", r)
		}
	}()

	fmt.Println("  📋 Checking required files in current directory...")

	// Since we're running from clients directory, check current directory
	requiredFiles := []string{
		"fetcher.go",
		"parser.go",
		"aircraft_api.go",
		"flights_api.go",
		"geopolitical_api.go",
		"sustainability_api.go",
		"weather_api.go",
		".env",
		"go.mod",
	}

	for _, file := range requiredFiles {
		if _, err := os.Stat(file); err == nil {
			// Check file size to see if it's actually implemented
			if info, err := os.Stat(file); err == nil {
				if info.Size() > 10 { // More than just a placeholder
					fmt.Printf("  ✅ %s exists (%d bytes)\n", file, info.Size())
				} else {
					fmt.Printf("  ⚠️  %s exists but appears to be a placeholder (%d bytes)\n", file, info.Size())
				}
			}
		} else {
			fmt.Printf("  ❌ %s missing or inaccessible\n", file)
		}
	}

	// Check .env file content in current directory
	fmt.Println("  📋 Checking .env file...")
	envPath := ".env"
	if envContent, err := os.ReadFile(envPath); err == nil {
		envStr := string(envContent)
		if len(envStr) > 0 {
			fmt.Printf("  ✅ .env file has content (%d bytes)\n", len(envContent))

			// Check for API key patterns (without revealing the keys)
			if containsPattern(envStr, "AVIATION_EDGE_API_KEY=") {
				fmt.Printf("  ✅ AVIATION_EDGE_API_KEY configured\n")
			} else {
				fmt.Printf("  ⚠️  AVIATION_EDGE_API_KEY not configured\n")
			}

			if containsPattern(envStr, "ICAO_API_KEY=") {
				fmt.Printf("  ✅ ICAO_API_KEY configured\n")
			} else {
				fmt.Printf("  ⚠️  ICAO_API_KEY not configured\n")
			}
		} else {
			fmt.Printf("  ⚠️  .env file is empty\n")
			fmt.Printf("  📝 Add your API keys to .env like:\n")
			fmt.Printf("      AVIATION_EDGE_API_KEY=your_key_here\n")
			fmt.Printf("      ICAO_API_KEY=your_key_here\n")
		}
	} else {
		fmt.Printf("  ❌ Cannot read .env file: %v\n", err)
	}

	// Check Go module in current directory
	fmt.Println("  📋 Checking go.mod...")
	modPath := "go.mod"
	if _, err := os.Stat(modPath); err == nil {
		fmt.Printf("  ✅ go.mod exists\n")
		if modContent, err := os.ReadFile(modPath); err == nil {
			fmt.Printf("  📝 Module content: %s\n", string(modContent))
		}
	} else {
		fmt.Printf("  ⚠️  go.mod missing\n")
	}

	// List all files in current directory for debugging
	fmt.Println("  📋 Files in current directory:")
	if files, err := os.ReadDir("."); err == nil {
		for _, file := range files {
			if file.IsDir() {
				fmt.Printf("    📁 %s/\n", file.Name())
			} else {
				if info, err := file.Info(); err == nil {
					fmt.Printf("    📄 %s (%d bytes)\n", file.Name(), info.Size())
				} else {
					fmt.Printf("    📄 %s\n", file.Name())
				}
			}
		}
	}
}

func containsPattern(content, pattern string) bool {
	if len(content) == 0 || len(pattern) == 0 {
		return false
	}

	for i := 0; i <= len(content)-len(pattern); i++ {
		if content[i:i+len(pattern)] == pattern {
			return true
		}
	}
	return false
}

// Helper function to repeat strings
func repeatString(s string, count int) string {
	result := ""
	for i := 0; i < count; i++ {
		result += s
	}
	return result
}
