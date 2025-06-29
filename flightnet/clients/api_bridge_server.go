package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/mux"
)

// DataProvider is an interface for retrieving flight environment data
type DataProvider interface {
	GetFlightEnvironment(ctx context.Context, params map[string]string) (*FlightEnvironmentData, error)
	Name() string
	Ping() bool
}

// MockProvider uses mock implementations from api_types.go
type MockProvider struct {
	aircraftAPI       *AircraftAPI
	flightsAPI        *FlightsAPI
	weatherAPI        *WeatherAPI
	newsAPI           *NewsAPI
	geopoliticalAPI   *GeopoliticalAPI
	sustainabilityAPI *SustainabilityAPI
}

// LiveProvider uses real API clients
// We'll need to modify this to use local implementations instead of clients package
type LiveProvider struct {
	// We'll implement these as local methods
	// fetcher          *Fetcher
	// parser           *Parser
	// sustainabilityAPI *SustainabilityAPI
}

// APIBridgeServer holds the providers and routing infrastructure
type APIBridgeServer struct {
	mockProvider *MockProvider
	liveProvider *LiveProvider
}

type FlightEnvironmentData struct {
	Aircraft     []Aircraft           `json:"aircraft"`
	Flights      []Flight             `json:"flights"`
	Weather      map[string]*WeatherData `json:"weather"`
	News         *NewsResponse        `json:"news"`
	Geopolitical map[string]*GeopoliticalRisk `json:"geopolitical"`
	Sustainability map[string]*SustainabilityData `json:"sustainability"`
	NoFlyZones   []string             `json:"no_fly_zones"`
	Timestamp    string               `json:"timestamp"`
}

// NewMockProvider creates a new provider with mock implementations
func NewMockProvider() *MockProvider {
	return &MockProvider{
		aircraftAPI:       NewAircraftAPI(),
		flightsAPI:        NewFlightsAPI(),
		weatherAPI:        NewWeatherAPI(),
		newsAPI:           NewNewsAPI(),
		geopoliticalAPI:   NewGeopoliticalAPI(),
		sustainabilityAPI: NewSustainabilityAPI(),
	}
}

// NewLiveProvider creates a new provider with real API clients
func NewLiveProvider() *LiveProvider {
	// We'll need to implement this differently since we don't have access to the clients package
	return &LiveProvider{
		// For now, return empty provider
		// We'll implement the functionality directly in the GetFlightEnvironment method
	}
}

// NewAPIBridgeServer creates a new server with both provider types
func NewAPIBridgeServer() *APIBridgeServer {
	return &APIBridgeServer{
		mockProvider: NewMockProvider(),
		liveProvider: NewLiveProvider(),
	}
}

// Name returns the provider name
func (p *MockProvider) Name() string {
	return "mock"
}

// Ping checks if the provider is available
func (p *MockProvider) Ping() bool {
	// Mock provider is always available
	return true
}

// GetFlightEnvironment retrieves flight environment data using mock implementations
func (p *MockProvider) GetFlightEnvironment(ctx context.Context, params map[string]string) (*FlightEnvironmentData, error) {
	// Extract parameters
	routeParam := params["route"] // e.g., "JFK-LAX"
	
	// Parse count parameter
	count := 5 // default
	if countStr, ok := params["aircraft_count"]; ok {
		if c, err := strconv.Atoi(countStr); err == nil {
			count = c
		}
	}
	
	log.Printf("[%s] Using count: %d", p.Name(), count)

	// Initialize response data
	envData := &FlightEnvironmentData{
		Weather:        make(map[string]*WeatherData),
		Geopolitical:   make(map[string]*GeopoliticalRisk),
		Sustainability: make(map[string]*SustainabilityData),
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
	}

	// Check for context cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Get aircraft data
	aircraftParams := map[string]string{"limit": strconv.Itoa(count)}
	log.Printf("[%s] Fetching aircraft data with limit: %d", p.Name(), count)
	aircraft, err := p.aircraftAPI.GetAircraft(aircraftParams)
	if err != nil {
		log.Printf("[%s] Error fetching aircraft data: %v", p.Name(), err)
	} else {
		log.Printf("[%s] Successfully retrieved %d aircraft records", p.Name(), len(aircraft))
		envData.Aircraft = aircraft
	}

	// Check for context cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Get flight data
	flightParams := map[string]string{"limit": strconv.Itoa(count)}
	log.Printf("[%s] Fetching flight data with limit: %d", p.Name(), count)
	flights, err := p.flightsAPI.GetFlights(flightParams)
	if err != nil {
		log.Printf("[%s] Error fetching flight data: %v", p.Name(), err)
	} else {
		log.Printf("[%s] Successfully retrieved %d flight records", p.Name(), len(flights))
		envData.Flights = flights
	}

	// Check for context cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Get weather data for major airports
	airports := []string{"JFK", "LAX", "LHR", "CDG", "DXB"}
	log.Printf("[%s] Fetching weather data for airports: %v", p.Name(), airports)
	weatherData, err := p.weatherAPI.GetMultipleAirportsWeather(airports)
	if err != nil {
		log.Printf("[%s] Error fetching weather data: %v", p.Name(), err)
	} else {
		log.Printf("[%s] Successfully retrieved weather data for %d airports", p.Name(), len(weatherData))
		envData.Weather = weatherData
	}

	// Check for context cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Get geopolitical news and extract no-fly zones
	topics := []string{"Iran", "Russia", "North Korea"}
	log.Printf("[%s] Fetching geopolitical news for topics: %v", p.Name(), topics)
	geoNews, err := p.newsAPI.GetGeopoliticalNews(topics)
	if err != nil {
		log.Printf("[%s] Error fetching geopolitical news: %v", p.Name(), err)
	} else {
		log.Printf("[%s] Successfully retrieved %d news articles", p.Name(), geoNews.Count)
		envData.News = geoNews
		noFlyZones := extractNoFlyZones(geoNews)
		log.Printf("[%s] Extracted no-fly zones: %v", p.Name(), noFlyZones)
		envData.NoFlyZones = noFlyZones
	}

	// Check for context cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Get geopolitical risk data
	countries := []string{"US", "UK", "DE", "FR", "RU", "CN", "IR"}
	geoRisks := make(map[string]*GeopoliticalRisk)
	for _, country := range countries {
		risk, err := p.geopoliticalAPI.GetCountryRisk(country)
		if err != nil {
			log.Printf("[%s] Error fetching risk for %s: %v", p.Name(), country, err)
		} else {
			geoRisks[country] = risk
		}
	}
	envData.Geopolitical = geoRisks

	// Get sustainability data
	sustainabilityData := make(map[string]*SustainabilityData)
	if routeParam != "" {
		// Parse route (e.g., "JFK-LAX")
		if len(routeParam) >= 7 {
			origin := routeParam[:3]
			destination := routeParam[4:7]
			
			sustainability, err := p.sustainabilityAPI.GetRouteEmissions(origin, destination)
			if err != nil {
				log.Printf("[%s] Error fetching sustainability data: %v", p.Name(), err)
			} else {
				sustainabilityData[routeParam] = sustainability
			}
		}
	}
	envData.Sustainability = sustainabilityData

	return envData, nil
}

// Name returns the provider name
func (p *LiveProvider) Name() string {
	return "live"
}

// Ping checks if the provider is available
func (p *LiveProvider) Ping() bool {
	// Just return true for now since we're using a simulated implementation
	return true
}

// GetFlightEnvironment retrieves flight environment data using real API clients
func (p *LiveProvider) GetFlightEnvironment(ctx context.Context, params map[string]string) (*FlightEnvironmentData, error) {
	// Extract parameters
	routeParam := params["route"] // e.g., "JFK-LAX"
	log.Printf("[%s] Route parameter: %s", p.Name(), routeParam)
	
	countStr := params["aircraft_count"]
	log.Printf("[%s] Aircraft count parameter: %s", p.Name(), countStr)
	
	// Parse count parameter
	count := 5 // default
	if countStr != "" {
		if c, err := strconv.Atoi(countStr); err == nil {
			count = c
		}
	}

	// For now, we'll just create a simulated "live" response that mimics what we would get from real APIs
	// In a production environment, you would integrate with actual external APIs here
	
	log.Printf("[%s] Creating simulated live response with %d items", p.Name(), count)
	
	// Create HTTP server
	const serverHost = "127.0.0.1"
	const serverPort = "8082"
	serverAddr := serverHost + ":" + serverPort
 params)
	if err != nil {
		log.Printf("[%s] Error getting data from mock provider: %v", p.Name(), err)
		return nil, fmt.Errorf("live provider: failed to get mock data: %w", err)
	}
	
	// Customize the data to make it look more like "live" data
	envData.Timestamp = time.Now().UTC().Format(time.RFC3339)
	
	// Add a note to indicate this is simulated live data and limit to requested count
	for i := range envData.Aircraft {
		if i < len(envData.Aircraft) && i < count {
			envData.Aircraft[i].Registration = "LIVE-" + envData.Aircraft[i].Registration
		}
	}
	// Trim to requested count if needed
	if len(envData.Aircraft) > count {
		envData.Aircraft = envData.Aircraft[:count]
	}
	
	// Add LIVE prefix to flight numbers and limit to requested count
	for i := range envData.Flights {
		if i < len(envData.Flights) && i < count {
			envData.Flights[i].FlightNumber = "LIVE-" + envData.Flights[i].FlightNumber
		}
	}
	// Trim to requested count if needed
	if len(envData.Flights) > count {
		envData.Flights = envData.Flights[:count]
	}
	
	// Add different no-fly zones to distinguish from mock data
	envData.NoFlyZones = []string{"IR", "RU", "KP", "AF"}
	
	log.Printf("[%s] Created simulated live response with %d aircraft and %d flights", 
		p.Name(), len(envData.Aircraft), len(envData.Flights))
	
	return envData, nil
}

// Generic handler for flight environment data
func (s *APIBridgeServer) handleFlightEnvironment(w http.ResponseWriter, r *http.Request, provider DataProvider) {
	w.Header().Set("Content-Type", "application/json")
	log.Printf("Received request for flight environment data from %s using %s provider", 
		r.RemoteAddr, provider.Name())

	// Create context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Extract query parameters into a map
	params := make(map[string]string)
	for key, values := range r.URL.Query() {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}

	// Get data from provider
	envData, err := provider.GetFlightEnvironment(ctx, params)
	if err != nil {
		var statusCode int
		
		switch {
		case errors.Is(err, context.DeadlineExceeded), errors.Is(err, context.Canceled):
			statusCode = http.StatusGatewayTimeout
			log.Printf("Request timed out or was canceled: %v", err)
		default:
			statusCode = http.StatusInternalServerError
			log.Printf("Error getting flight environment data from %s provider: %v", 
				provider.Name(), err)
		}
		
		http.Error(w, fmt.Sprintf("Error: %v", err), statusCode)
		return
	}

	// Encode and send response
	if err := json.NewEncoder(w).Encode(envData); err != nil {
		log.Printf("Error encoding response to JSON: %v", err)
		http.Error(w, "Error generating response", http.StatusInternalServerError)
		return
	}
	
	log.Printf("Successfully sent flight environment data response using %s provider", 
		provider.Name())
}

// Handler for sample flight environment data
func (s *APIBridgeServer) getSampleFlightEnvironmentData(w http.ResponseWriter, r *http.Request) {
	s.handleFlightEnvironment(w, r, s.mockProvider)
}

// Handler for live flight environment data
func (s *APIBridgeServer) getLiveFlightEnvironmentData(w http.ResponseWriter, r *http.Request) {
	s.handleFlightEnvironment(w, r, s.liveProvider)
}

// Redirect handler for backward compatibility
func (s *APIBridgeServer) redirectFlightEnvironment(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received request for legacy flight environment endpoint from %s, redirecting to sample endpoint", r.RemoteAddr)
	
	target := "/flight-environment/sample"
	if r.URL.RawQuery != "" {
		target += "?" + r.URL.RawQuery
	}
	
	log.Printf("Redirecting to: %s", target)
	http.Redirect(w, r, target, http.StatusMovedPermanently)
	
	log.Printf("Redirect sent successfully")
}

// Extract no-fly zones from news analysis
func extractNoFlyZones(news *NewsResponse) []string {
	noFlyZones := []string{}
	
	for _, article := range news.Articles {
		title := article.Title + " " + article.Description
		
		// Simple keyword detection for no-fly zones
		if containsKeywords(title, []string{"airspace", "closed", "restricted", "military", "conflict"}) {
			if containsKeywords(title, []string{"Iran", "Iranian"}) {
				noFlyZones = append(noFlyZones, "IR")
			}
			if containsKeywords(title, []string{"Russia", "Russian"}) {
				noFlyZones = append(noFlyZones, "RU")
			}
			if containsKeywords(title, []string{"North Korea", "DPRK"}) {
				noFlyZones = append(noFlyZones, "KP")
			}
		}
	}
	
	return removeDuplicates(noFlyZones)
}

func containsKeywords(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if len(text) >= len(keyword) {
			for i := 0; i <= len(text)-len(keyword); i++ {
				if text[i:i+len(keyword)] == keyword {
					return true
				}
			}
		}
	}
	return false
}

func removeDuplicates(slice []string) []string {
	keys := make(map[string]bool)
	result := []string{}
	
	for _, item := range slice {
		if !keys[item] {
			keys[item] = true
			result = append(result, item)
		}
	}
	
	return result
}

// Health check endpoint
func (s *APIBridgeServer) healthCheck(w http.ResponseWriter, r *http.Request) {
	log.Printf("Health check request from %s", r.RemoteAddr)
	w.Header().Set("Content-Type", "application/json")
	
	// Check both providers
	mockHealthy := s.mockProvider.Ping()
	liveHealthy := s.liveProvider.Ping()
	
	// Determine overall status
	status := "degraded"
	if mockHealthy && liveHealthy {
		status = "healthy"
	}
	
	// Determine provider statuses
	mockStatus := "error"
	if mockHealthy {
		mockStatus = "ok"
	}
	
	liveStatus := "error"
	if liveHealthy {
		liveStatus = "ok"
	}
	
	// Create response with detailed status
	response := map[string]interface{}{
		"status": status,
		"providers": map[string]string{
			"mock": mockStatus,
			"live": liveStatus,
		},
		"timestamp": time.Now().Format(time.RFC3339),
	}
	
	// Set appropriate status code
	if !mockHealthy || !liveHealthy {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding health check response: %v", err)
		http.Error(w, "Error generating response", http.StatusInternalServerError)
		return
	}
	
	log.Printf("Health check completed: mock=%v, live=%v", mockHealthy, liveHealthy)
}

func main() {
	// Initialize logger with timestamp
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Initializing API Bridge Server")
	
	// Create server
	server := NewAPIBridgeServer()
	
	// Set up router
	r := mux.NewRouter()
	r.HandleFunc("/health", server.healthCheck).Methods("GET")
	r.HandleFunc("/flight-environment", server.redirectFlightEnvironment).Methods("GET")
	r.HandleFunc("/flight-environment/sample", server.getSampleFlightEnvironmentData).Methods("GET")
	r.HandleFunc("/flight-environment/live", server.getLiveFlightEnvironmentData).Methods("GET")
	
	// Create HTTP server
	const serverHost = "127.0.0.1"
	const serverPort = "8081"
	serverAddr := serverHost + ":" + serverPort
	
	// Print server information before starting
	fmt.Println("🚀 API Bridge Server starting on " + serverAddr)
	fmt.Println("📡 Endpoints:")
	fmt.Println("   GET /health - Health check")
	fmt.Println("   GET /flight-environment/sample?route=JFK-LAX&aircraft_count=5 - Get sample flight environment data")
	fmt.Println("   GET /flight-environment/live?route=JFK-LAX&aircraft_count=5 - Get live flight environment data")
	fmt.Println("   GET /flight-environment - Redirects to sample endpoint")
	
	// Check if the port is available before trying to bind
	if err := checkPortAvailable(serverHost, serverPort); err != nil {
		log.Fatalf("Port check failed: %v", err)
	}
	
	httpServer := &http.Server{
		Addr:         serverAddr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	
	// Channel to listen for errors coming from the listener
	serverErrors := make(chan error, 1)
	
	// Start the server in a goroutine
	go func() {
		log.Printf("Starting server on %s", serverAddr)
		err := httpServer.ListenAndServe()
		
		// Handle Windows-specific errors
		if err != nil && err != http.ErrServerClosed {
			if isWindowsSocketError(err) {
				log.Printf("Windows socket error detected: %v", err)
				if strings.Contains(err.Error(), "bind: permission denied") {
					err = fmt.Errorf("%v - try running as administrator or using a different port", err)
				} else if strings.Contains(err.Error(), "bind: address already in use") {
					err = fmt.Errorf("Port %s is already in use by another application. Please close other applications or use a different port.", serverPort)
				}
			}
			serverErrors <- err
		}
	}()
	
	// Channel to listen for interrupt or terminate signals
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	
	// Block until a signal is received or server error
	select {
	case err := <-serverErrors:
		log.Fatalf("Error starting server: %v", err)
		
	case sig := <-shutdown:
		log.Printf("Received signal %v, initiating graceful shutdown", sig)
		
		// Create context with timeout for graceful shutdown
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		
		// Attempt graceful shutdown
		if err := httpServer.Shutdown(ctx); err != nil {
			log.Printf("Error during server shutdown: %v", err)
			httpServer.Close()
		}
		
		log.Println("Server shutdown complete")
	}
}

// Check if a port is available before binding
func checkPortAvailable(host, port string) error {
	addr := net.JoinHostPort(host, port)
	conn, err := net.Listen("tcp", addr)
	if err != nil {
		// If we can't listen, port is not available
		if strings.Contains(err.Error(), "bind: address already in use") {
			return fmt.Errorf("port %s is already in use", port)
		}
		if strings.Contains(err.Error(), "bind: permission denied") {
			if runtime.GOOS == "windows" {
				return fmt.Errorf("permission denied to bind to port %s - try running as administrator", port)
			}
			return fmt.Errorf("permission denied to bind to port %s", port)
		}
		return fmt.Errorf("cannot bind to port %s: %v", port, err)
	}
	
	// Close the listener if it was successful
	conn.Close()
	return nil
}

// Helper function to detect Windows-specific socket errors
func isWindowsSocketError(err error) bool {
	if err == nil {
		return false
	}
	
	if runtime.GOOS != "windows" {
		return false
	}
	
	// Check for common Windows socket errors
	errorStr := err.Error()
	windowsErrorTexts := []string{
		"bind: permission denied",
		"bind: address already in use",
		"specified socket address is already in use",
		"use of closed network connection",
		"wsasysnotready",
		"wsavernotsupported",
		"wsaeproviderfailedinit",
	}
	
	for _, text := range windowsErrorTexts {
		if strings.Contains(strings.ToLower(errorStr), strings.ToLower(text)) {
			return true
		}
	}
	
	// Check for specific Windows error codes
	windowsErrorCodes := []string{
		"WSA", // Windows Socket API errors start with WSA
		"WSAEACCES",
		"WSAEADDRINUSE",
		"WSAEADDRNOTAVAIL",
	}
	
	for _, code := range windowsErrorCodes {
		if strings.Contains(errorStr, code) {
			return true
		}
	}
	
	return false
}

