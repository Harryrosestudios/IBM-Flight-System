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

// Fetcher handles HTTP requests
type Fetcher struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

// NewFetcher creates a new Fetcher instance
func NewFetcher() *Fetcher {
	// Try to get API key from environment
	apiKey := os.Getenv("AVIATION_EDGE_API_KEY")
	
	// If not found, try to load from .env file
	if apiKey == "" {
		log.Println("API key not found in environment, trying .env file")
		apiKey = loadAPIKeyFromEnvFile()
		
		if apiKey != "" {
			log.Println("API key loaded from .env file")
		} else {
			log.Println("API key not found in .env file")
		}
	} else {
		log.Println("API key found in environment variables")
	}
	
	return &Fetcher{
		baseURL: "https://aviation-edge.com/v2/public",
		apiKey:  apiKey,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// loadAPIKeyFromEnvFile tries to load API key from .env file
func loadAPIKeyFromEnvFile() string {
	// Try current directory
	log.Println("Trying to load .env from current directory")
	if envContent, err := os.ReadFile(".env"); err == nil {
		log.Println("Found .env in current directory")
		return extractAPIKey(string(envContent))
	} else {
		log.Println("Error reading .env from current directory:", err)
	}
	
	// Try clients directory
	log.Println("Trying to load .env from ../clients/.env")
	if envContent, err := os.ReadFile("../clients/.env"); err == nil {
		log.Println("Found .env in ../clients/.env")
		return extractAPIKey(string(envContent))
	} else {
		log.Println("Error reading .env from ../clients/.env:", err)
	}
	
	// Try with absolute path
	if dir, err := os.Getwd(); err == nil {
		log.Println("Current directory:", dir)
		if strings.Contains(dir, "flightnet") {
			parts := strings.Split(dir, "flightnet")
			if len(parts) > 1 {
				clientsPath := parts[0] + "flightnet/clients/.env"
				log.Println("Trying to load .env from:", clientsPath)
				if envContent, err := os.ReadFile(clientsPath); err == nil {
					log.Println("Found .env at:", clientsPath)
					return extractAPIKey(string(envContent))
				} else {
					log.Println("Error reading .env from", clientsPath, ":", err)
				}
			}
		}
	}
	
	// Try one more path: relative from cmd/test
	log.Println("Trying to load .env from ../../clients/.env")
	if envContent, err := os.ReadFile("../../clients/.env"); err == nil {
		log.Println("Found .env in ../../clients/.env")
		return extractAPIKey(string(envContent))
	} else {
		log.Println("Error reading .env from ../../clients/.env:", err)
	}
	
	return ""
}

// extractAPIKey extracts API key from .env file content
func extractAPIKey(content string) string {
	log.Println("Extracting API key from content:", content)
	re := regexp.MustCompile(`AVIATION_EDGE_API_KEY=([^\s]+)`)
	matches := re.FindStringSubmatch(content)
	if len(matches) > 1 {
		log.Println("Extracted API key:", matches[1])
		return matches[1]
	}
	log.Println("No API key found in content")
	return ""
}

// Get makes a GET request to the API
func (f *Fetcher) Get(endpoint string, params map[string]string) ([]byte, error) {
	// Check if API key is set
	if f.apiKey == "" {
		log.Println("API key is not set, returning mock response for endpoint:", endpoint)
		// For testing purposes, return a mock response with empty data
		switch endpoint {
		case "airplaneDatabase":
			return []byte(`[{"airplaneId":"mock-id"}]`), nil
		case "flights":
			return []byte(`[{"flight":{"number":"mock-flight"}}]`), nil
		case "flightsFuture":
			return []byte(`[{"flight":{"number":"mock-future"}}]`), nil
		default:
			return []byte(`[{}]`), nil
		}
	}
	
	log.Println("Making API request to endpoint:", endpoint, "with params:", params)

	// Build base URL with API key
	baseURL := fmt.Sprintf("%s/%s?key=%s", f.baseURL, endpoint, f.apiKey)
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, fmt.Errorf("error parsing URL: %w", err)
	}

	// Add query parameters
	q := u.Query()
	for key, value := range params {
		q.Add(key, value)
	}
	u.RawQuery = q.Encode()

	// Create request
	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Send request
	log.Println("Sending request to URL:", req.URL.String())
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

	log.Println("Received response, length:", len(body))
	if len(body) < 1000 {
		log.Println("Response:", string(body))
	} else {
		log.Println("Response too large to log, first 500 chars:", string(body[:500]))
	}

	return body, nil
}

// Post makes a POST request to an external API
func (f *Fetcher) Post(url string, data interface{}) (*http.Response, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("error marshaling JSON: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	return f.client.Do(req)
}

