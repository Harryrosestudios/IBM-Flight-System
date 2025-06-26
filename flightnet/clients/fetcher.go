package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// API configuration struct
type APIConfig struct {
	MetOfficeKey         string
	AviationEdgeKey      string
	RaneNetworkKey       string
	CargoAiKey           string
	TimeoutSeconds       int
}

// Fetcher service
type Fetcher struct {
	config APIConfig
	client *http.Client
}

// Initialize fetcher with configuration
func NewFetcher(cfg APIConfig) *Fetcher {
	return &Fetcher{
		config: cfg,
		client: &http.Client{
			Timeout: time.Duration(cfg.TimeoutSeconds) * time.Second,
		},
	}
}

// Unified response structure
type FlightData struct {
	Weather       *WeatherResponse       `json:"weather"`
	Geopolitical  *GeopoliticalResponse  `json:"geopolitical"`
	Aircraft      *AircraftResponse      `json:"aircraft"`
	Sustainability *SustainabilityResponse `json:"sustainability"`
}

// Main fetch method with context support
func (f *Fetcher) FetchAll(ctx context.Context, flightPath string) (*FlightData, error) {
	var wg sync.WaitGroup
	errChan := make(chan error, 4)
	result := &FlightData{}

	// Weather data
	wg.Add(1)
	go func() {
		defer wg.Done()
		resp, err := f.fetchMetOffice(ctx, flightPath)
		if err == nil {
			result.Weather = resp
		}
		errChan <- err
	}()

	// Geopolitical data
	wg.Add(1)
	go func() {
		defer wg.Done()
		resp, err := f.fetchRaneNetwork(ctx, flightPath)
		if err == nil {
			result.Geopolitical = resp
		}
		errChan <- err
	}()

	// Aircraft data
	wg.Add(1)
	go func() {
		defer wg.Done()
		resp, err := f.fetchAviationStack(ctx)
		if err == nil {
			result.Aircraft = resp
		}
		errChan <- err
	}()

	// Sustainability data
	wg.Add(1)
	go func() {
		defer wg.Done()
		resp, err := f.fetchCargoAi(ctx)
		if err == nil {
			result.Sustainability = resp
		}
		errChan <- err
	}()

	// Wait for completion
	wg.Wait()
	close(errChan)

	// Collect errors
	var errs []error
	for err := range errChan {
		if err != nil {
			errs = append(errs, err)
		}
	}

	if len(errs) > 0 {
		return result, fmt.Errorf("partial failure: %v", errs)
	}
	return result, nil
}

// Fetch Met Office 4D-Trajectory data
func (f *Fetcher) fetchMetOffice(ctx context.Context, flightPath string) (*WeatherResponse, error) {
	req, _ := http.NewRequestWithContext(ctx, "GET", 
		"https://api.metoffice.gov.uk/4dt", nil)
	q := req.URL.Query()
	q.Add("path", flightPath)
	req.URL.RawQuery = q.Encode()
	req.Header.Add("Authorization", "Bearer "+f.config.MetOfficeKey)

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("metoffice: invalid response")
	}

	var data WeatherResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

// Other API methods follow similar pattern:
// fetchRaneNetwork, fetchAviationStack, fetchCargoAi
// (Implementation details would mirror fetchMetOffice)

// Helper for API requests
func (f *Fetcher) apiGet(ctx context.Context, url, authHeader string, target interface{}) error {
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	if authHeader != "" {
		req.Header.Add("Authorization", authHeader)
	}

	resp, err := f.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("api error: %s", string(body))
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

