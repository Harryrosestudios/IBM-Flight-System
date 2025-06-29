package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// APIConfig holds configuration for different API endpoints
type APIConfig struct {
	BaseURL string
	APIKey  string
	Headers map[string]string
}

// Fetcher handles HTTP requests for multiple APIs
type Fetcher struct {
	configs map[string]APIConfig
	client  *http.Client
}

// NewFetcher creates a new Fetcher instance with multiple API configurations
func NewFetcher() *Fetcher {
	aviationEdgeKey := getAPIKey("AVIATION_EDGE_API_KEY")
	icaoKey := getAPIKey("ICAO_API_KEY")

	configs := map[string]APIConfig{
		"aviation-edge": {
			BaseURL: "https://aviation-edge.com/v2/public",
			APIKey:  aviationEdgeKey,
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
		},
		"icao": {
			BaseURL: "https://api.icao.int/v1",
			APIKey:  icaoKey,
			Headers: map[string]string{
				"Content-Type":              "application/json",
				"Ocp-Apim-Subscription-Key": icaoKey,
			},
		},
		"world-bank": {
			BaseURL: "https://api.worldbank.org/v2",
			APIKey:  "", // World Bank API is free, no key needed
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
		},
		"fuel-api": {
			BaseURL: "https://despouy.ca/flight-fuel-api/q",
			APIKey:  "",
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
		},
	}

	return &Fetcher{
		configs: configs,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// getAPIKey tries to get API key from environment or .env file
func getAPIKey(keyName string) string {
	apiKey := os.Getenv(keyName)
	if apiKey == "" {
		log.Printf("API key %s not found in environment, trying .env file", keyName)
		apiKey = loadAPIKeyFromEnvFile(keyName)
		if apiKey != "" {
			log.Printf("API key %s loaded from .env file", keyName)
		} else {
			log.Printf("API key %s not found in .env file", keyName)
		}
	} else {
		log.Printf("API key %s found in environment variables", keyName)
	}
	return apiKey
}

// loadAPIKeyFromEnvFile tries to load API key from .env file
func loadAPIKeyFromEnvFile(keyName string) string {
	envPaths := []string{
		".env",
		"../clients/.env",
		"../../clients/.env",
	}

	// Try with absolute path
	if dir, err := os.Getwd(); err == nil {
		if strings.Contains(dir, "flightnet") {
			parts := strings.Split(dir, "flightnet")
			if len(parts) > 1 {
				clientsPath := parts[0] + "flightnet/clients/.env"
				envPaths = append(envPaths, clientsPath)
			}
		}
	}

	for _, path := range envPaths {
		if envContent, err := os.ReadFile(path); err == nil {
			log.Printf("Found .env at: %s", path)
			return extractAPIKey(string(envContent), keyName)
		}
	}

	return ""
}

// extractAPIKey extracts specific API key from .env file content
func extractAPIKey(content, keyName string) string {
	re := regexp.MustCompile(fmt.Sprintf(`%s=([^\s]+)`, keyName))
	matches := re.FindStringSubmatch(content)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// Get makes a GET request to the specified API
func (f *Fetcher) Get(apiName, endpoint string, params map[string]string) ([]byte, error) {
	config, exists := f.configs[apiName]
	if !exists {
		return nil, fmt.Errorf("unknown API: %s", apiName)
	}

	// Handle mock responses when API key is not set
	if config.APIKey == "" && apiName != "fuel-api" && apiName != "world-bank" {
		log.Printf("API key not set for %s, returning mock response for endpoint: %s", apiName, endpoint)
		return f.getMockResponse(apiName, endpoint), nil
	}

	// Build URL
	var fullURL string
	switch apiName {
	case "aviation-edge":
		fullURL = fmt.Sprintf("%s/%s?key=%s", config.BaseURL, endpoint, config.APIKey)
	case "fuel-api":
		fullURL = fmt.Sprintf("%s/?aircraft=%s&distance=%s", config.BaseURL, params["aircraft"], params["distance"])
		if params["gcd"] == "true" {
			fullURL += "&gcd=true"
		}
	case "world-bank":
		// Construct World Bank API URL with parameters
		// Examples:
		// https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json
		// https://api.worldbank.org/v2/sources?per_page=100&format=json
		// https://api.worldbank.org/v2/indicator?format=json&source=6
		fullURL = fmt.Sprintf("%s/%s", config.BaseURL, endpoint)
	case "icao":
		fullURL = fmt.Sprintf("%s/%s", config.BaseURL, endpoint)
	default:
		fullURL = fmt.Sprintf("%s/%s", config.BaseURL, endpoint)
	}

	u, err := url.Parse(fullURL)
	if err != nil {
		return nil, fmt.Errorf("error parsing URL: %w", err)
	}

	// Add query parameters
	if apiName != "fuel-api" {
		q := u.Query()
		for key, value := range params {
			if key != "aircraft" && key != "distance" && key != "gcd" {
				q.Add(key, value)
			}
		}
		u.RawQuery = q.Encode()
	}

	// Create request
	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Add headers
	for key, value := range config.Headers {
		req.Header.Set(key, value)
	}

	// Send request
	log.Printf("Sending request to URL: %s", req.URL.String())
	resp, err := f.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, response: %s", resp.StatusCode, string(body))
	}

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}

	log.Printf("Received response from %s, length: %d", apiName, len(body))
	return body, nil
}

// Post makes a POST request to the specified API
func (f *Fetcher) Post(apiName, endpoint string, data interface{}) ([]byte, error) {
	config, exists := f.configs[apiName]
	if !exists {
		return nil, fmt.Errorf("unknown API: %s", apiName)
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("error marshaling JSON: %w", err)
	}

	fullURL := fmt.Sprintf("%s/%s", config.BaseURL, endpoint)
	req, err := http.NewRequest("POST", fullURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Add headers
	for key, value := range config.Headers {
		req.Header.Set(key, value)
	}

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}

	return body, nil
}

// getMockResponse returns mock responses for testing
func (f *Fetcher) getMockResponse(apiName, endpoint string) []byte {
	switch apiName {
	case "aviation-edge":
		switch endpoint {
		case "airplaneDatabase":
			return []byte(`[{"airplaneId":"mock-id"}]`)
		case "flights":
			return []byte(`[{"flight":{"number":"mock-flight"}}]`)
		case "flightsFuture":
			return []byte(`[{"flight":{"number":"mock-future"}}]`)
		case "airportWeather":
			return []byte(`{"airport_icao":"MOCK","current_weather":{"temperature":{"celsius":20}}}`)
		default:
			return []byte(`[{}]`)
		}
	case "icao":
		return []byte(`{"co2_emissions":{"total_kg":1000}}`)
	case "world-bank":
		switch endpoint {
		case "sources":
			return []byte(`[{"page":1,"pages":1,"per_page":"50","total":61},[{"id":"1","name":"Doing Business","code":"","description":"","url":"","dataavailability":"Y","metadataavailability":"Y","concepts":"3"}]]`)
		case "indicator":
			return []byte(`[{"page":1,"pages":1,"per_page":"50","total":16000},[{"id":"SP.POP.TOTL","name":"Population, total","unit":"","source":{"id":"2","value":"World Development Indicators"},"sourceNote":"Total population is based on the de facto definition of population.","sourceOrganization":"( 1 ) United Nations Population Division.","topics":[{"id":"8","value":"Health "}]}]]`)
		default:
			return []byte(`[{"page":1,"pages":1,"per_page":"50","total":1},[{"id":"mock","value":"Mock World Bank Data"}]]`)
		}
	case "fuel-api":
		return []byte(`{"aircraft":"mock-aircraft","distance":1000,"fuel_burn":2000,"co2_emissions":6000,"unit":"kg"}`)
	default:
		return []byte(`{}`)
	}
}
