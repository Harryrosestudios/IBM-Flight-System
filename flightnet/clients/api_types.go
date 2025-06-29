package main

import (
	"errors"
	"fmt"
	"math/rand"
	"time"
)

// ----- Data Models -----

// Aircraft represents an aircraft with its properties
type Aircraft struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"`
	Manufacturer string    `json:"manufacturer"`
	Model        string    `json:"model"`
	Registration string    `json:"registration"`
	Location     GeoPoint  `json:"location"`
	Altitude     int       `json:"altitude"`
	Speed        int       `json:"speed"`
	Heading      int       `json:"heading"`
	Status       string    `json:"status"`
	LastUpdated  time.Time `json:"last_updated"`
}

// GeoPoint represents a geographical location
type GeoPoint struct {
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lng"`
}

// Flight represents a scheduled flight
type Flight struct {
	FlightNumber string    `json:"flight_number"`
	Airline      string    `json:"airline"`
	Origin       string    `json:"origin"`
	Destination  string    `json:"destination"`
	DepartureTime time.Time `json:"departure_time"`
	ArrivalTime  time.Time `json:"arrival_time"`
	Status       string    `json:"status"`
	Aircraft     string    `json:"aircraft_id"`
	Distance     int       `json:"distance_km"`
	Duration     int       `json:"duration_min"`
	Gate         string    `json:"gate"`
}

// WeatherData represents weather conditions at a location
type WeatherData struct {
	Location      string  `json:"location"`
	Temperature   float64 `json:"temperature_c"`
	WindSpeed     float64 `json:"wind_speed_kph"`
	WindDirection int     `json:"wind_direction_deg"`
	Conditions    string  `json:"conditions"`
	Visibility    float64 `json:"visibility_km"`
	Pressure      float64 `json:"pressure_hpa"`
	Humidity      int     `json:"humidity_percent"`
	Precipitation float64 `json:"precipitation_mm"`
	Updated       string  `json:"updated_at"`
}

// NewsArticle represents a single news article
type NewsArticle struct {
	Source      string `json:"source"`
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	PublishedAt string `json:"published_at"`
	Relevance   int    `json:"relevance"`
}

// NewsResponse represents a collection of news articles
type NewsResponse struct {
	Articles []NewsArticle `json:"articles"`
	Count    int           `json:"count"`
	Query    string        `json:"query"`
}

// GeopoliticalRisk represents risk assessment for a country
type GeopoliticalRisk struct {
	Country     string   `json:"country"`
	RiskLevel   int      `json:"risk_level"` // 1-10 scale
	Factors     []string `json:"risk_factors"`
	Advisory    string   `json:"travel_advisory"`
	LastUpdated string   `json:"last_updated"`
}

// SustainabilityData represents environmental impact data
type SustainabilityData struct {
	Route         string  `json:"route"`
	Distance      int     `json:"distance_km"`
	CO2Emissions  float64 `json:"co2_emissions_kg"`
	FuelEfficiency float64 `json:"fuel_efficiency_l_per_100km"`
	AlternativeFuel bool   `json:"alternative_fuel_available"`
	NoiseLevel    int     `json:"noise_level_db"`
	EmissionsRating string `json:"emissions_rating"` // A, B, C, D, E
}

// ----- API Clients -----

// AircraftAPI client for aircraft data
type AircraftAPI struct{}

// NewAircraftAPI creates a new aircraft API client
func NewAircraftAPI() *AircraftAPI {
	return &AircraftAPI{}
}

// GetAircraft retrieves aircraft data
func (api *AircraftAPI) GetAircraft(params map[string]string) ([]Aircraft, error) {
	// Mock implementation
	limit := 5
	if val, ok := params["limit"]; ok {
		fmt.Sscanf(val, "%d", &limit)
	}

	aircraft := []Aircraft{}
	
	types := []string{"Commercial", "Private", "Cargo", "Military"}
	manufacturers := []string{"Boeing", "Airbus", "Embraer", "Bombardier"}
	models := []string{"747-800", "A380", "E195", "Global 7500"}
	statuses := []string{"In Flight", "Scheduled", "Delayed", "Landed"}
	
	for i := 0; i < limit; i++ {
		now := time.Now()
		aircraft = append(aircraft, Aircraft{
			ID:           fmt.Sprintf("AC%04d", 1000+i),
			Type:         types[rand.Intn(len(types))],
			Manufacturer: manufacturers[rand.Intn(len(manufacturers))],
			Model:        models[rand.Intn(len(models))],
			Registration: fmt.Sprintf("N%d%c%c", 100+i, 'A'+rand.Intn(26), 'A'+rand.Intn(26)),
			Location: GeoPoint{
				Latitude:  (rand.Float64() * 170) - 85, // -85 to +85
				Longitude: (rand.Float64() * 360) - 180, // -180 to +180
			},
			Altitude:    int(30000 + rand.Float64()*10000),
			Speed:       int(400 + rand.Float64()*200),
			Heading:     rand.Intn(360),
			Status:      statuses[rand.Intn(len(statuses))],
			LastUpdated: now.Add(time.Duration(-rand.Intn(60)) * time.Minute),
		})
	}

	return aircraft, nil
}

// FlightsAPI client for flight data
type FlightsAPI struct{}

// NewFlightsAPI creates a new flights API client
func NewFlightsAPI() *FlightsAPI {
	return &FlightsAPI{}
}

// GetFlights retrieves flight data
func (api *FlightsAPI) GetFlights(params map[string]string) ([]Flight, error) {
	// Mock implementation
	limit := 5
	if val, ok := params["limit"]; ok {
		fmt.Sscanf(val, "%d", &limit)
	}
	
	flights := []Flight{}
	
	airlines := []string{"United", "Delta", "British Airways", "Lufthansa", "Emirates"}
	origins := []string{"JFK", "LAX", "LHR", "CDG", "DXB"}
	destinations := []string{"ORD", "SFO", "FRA", "AMS", "SIN"}
	statuses := []string{"On Time", "Delayed", "Boarding", "In Air", "Landed"}
	
	now := time.Now()
	
	for i := 0; i < limit; i++ {
		airline := airlines[rand.Intn(len(airlines))]
		origin := origins[rand.Intn(len(origins))]
		destination := destinations[rand.Intn(len(destinations))]
		
		// Avoid same origin and destination
		for destination == origin {
			destination = destinations[rand.Intn(len(destinations))]
		}
		
		departureTime := now.Add(time.Duration(rand.Intn(24)) * time.Hour)
		flightDuration := 120 + rand.Intn(600) // 2-10 hours in minutes
		
		flights = append(flights, Flight{
			FlightNumber: fmt.Sprintf("%s%d", airline[:2], 1000+i),
			Airline:      airline,
			Origin:       origin,
			Destination:  destination,
			DepartureTime: departureTime,
			ArrivalTime:  departureTime.Add(time.Duration(flightDuration) * time.Minute),
			Status:       statuses[rand.Intn(len(statuses))],
			Aircraft:     fmt.Sprintf("AC%04d", 1000+rand.Intn(20)),
			Distance:     800 + rand.Intn(8000),
			Duration:     flightDuration,
			Gate:         fmt.Sprintf("%c%d", 'A'+rand.Intn(6), 1+rand.Intn(20)),
		})
	}
	
	return flights, nil
}

// WeatherAPI client for weather data
type WeatherAPI struct{}

// NewWeatherAPI creates a new weather API client
func NewWeatherAPI() *WeatherAPI {
	return &WeatherAPI{}
}

// GetMultipleAirportsWeather retrieves weather data for multiple airports
func (api *WeatherAPI) GetMultipleAirportsWeather(airports []string) (map[string]*WeatherData, error) {
	// Mock implementation
	weatherMap := make(map[string]*WeatherData)
	
	conditions := []string{
		"Clear", "Partly Cloudy", "Cloudy", "Light Rain", 
		"Heavy Rain", "Thunderstorm", "Snow", "Fog",
	}
	
	for _, airport := range airports {
		weatherMap[airport] = &WeatherData{
			Location:      airport,
			Temperature:   (rand.Float64() * 50) - 10, // -10C to 40C
			WindSpeed:     rand.Float64() * 60,        // 0-60 kph
			WindDirection: rand.Intn(360),
			Conditions:    conditions[rand.Intn(len(conditions))],
			Visibility:    rand.Float64() * 10,        // 0-10 km
			Pressure:      980 + rand.Float64()*50,    // 980-1030 hPa
			Humidity:      rand.Intn(100),
			Precipitation: rand.Float64() * 20,        // 0-20 mm
			Updated:       time.Now().Format(time.RFC3339),
		}
	}
	
	return weatherMap, nil
}

// NewsAPI client for news data
type NewsAPI struct{}

// NewNewsAPI creates a new news API client
func NewNewsAPI() *NewsAPI {
	return &NewsAPI{}
}

// GetGeopoliticalNews retrieves geopolitical news related to specified topics
func (api *NewsAPI) GetGeopoliticalNews(topics []string) (*NewsResponse, error) {
	// Mock implementation
	articles := []NewsArticle{}
	
	sources := []string{"Reuters", "BBC", "CNN", "Al Jazeera", "Aviation Weekly"}
	
	// Create some relevant mock articles
	articlesByTopic := map[string][]string{
		"Iran": {
			"Iran restricts airspace access in northern region",
			"Airlines advised to avoid Iranian airspace amid tensions",
			"New diplomatic efforts to ease tensions in Iranian airspace",
		},
		"Russia": {
			"Russia declares no-fly zone over parts of its western border",
			"Commercial flights diverted around Russian military exercises",
			"Negotiations ongoing to reopen eastern Russian airspace",
		},
		"North Korea": {
			"North Korea missile tests prompt airspace concerns",
			"Airlines avoid North Korean airspace after recent activity",
			"ICAO issues advisory for DPRK flight information region",
		},
	}
	
	for _, topic := range topics {
		if topicArticles, ok := articlesByTopic[topic]; ok {
			for _, title := range topicArticles {
				articles = append(articles, NewsArticle{
					Source:      sources[rand.Intn(len(sources))],
					Title:       title,
					Description: fmt.Sprintf("Details about %s and its impact on international aviation.", title),
					URL:         fmt.Sprintf("https://example.com/news/%d", rand.Intn(1000)),
					PublishedAt: time.Now().Add(-time.Duration(rand.Intn(72)) * time.Hour).Format(time.RFC3339),
					Relevance:   rand.Intn(5) + 6, // 6-10 scale
				})
			}
		}
	}
	
	return &NewsResponse{
		Articles: articles,
		Count:    len(articles),
		Query:    fmt.Sprintf("topics:%v", topics),
	}, nil
}

// GeopoliticalAPI client for geopolitical risk data
type GeopoliticalAPI struct{}

// NewGeopoliticalAPI creates a new geopolitical API client
func NewGeopoliticalAPI() *GeopoliticalAPI {
	return &GeopoliticalAPI{}
}

// GetCountryRisk retrieves risk assessment for a specific country
func (api *GeopoliticalAPI) GetCountryRisk(countryCode string) (*GeopoliticalRisk, error) {
	// Mock implementation
	riskFactors := map[string][]string{
		"US": {"Severe weather in some regions", "Occasional civil unrest"},
		"UK": {"Transportation strikes", "Heightened security at airports"},
		"DE": {"Border control issues", "Environmental protests"},
		"FR": {"Labor strikes", "Occasional protests"},
		"RU": {"Military activities", "Airspace restrictions", "Sanctions impact"},
		"CN": {"Airspace congestion", "Regional tensions", "Strict overflight regulations"},
		"IR": {"Military activity", "Political tensions", "International sanctions"},
	}
	
	riskLevels := map[string]int{
		"US": 2, "UK": 2, "DE": 2, "FR": 3, 
		"RU": 7, "CN": 5, "IR": 8,
	}
	
	advisories := map[string]string{
		"US": "Exercise normal precautions",
		"UK": "Exercise normal precautions",
		"DE": "Exercise normal precautions",
		"FR": "Exercise increased caution",
		"RU": "Reconsider travel",
		"CN": "Exercise increased caution",
		"IR": "Do not travel",
	}
	
	if factors, ok := riskFactors[countryCode]; ok {
		return &GeopoliticalRisk{
			Country:     countryCode,
			RiskLevel:   riskLevels[countryCode],
			Factors:     factors,
			Advisory:    advisories[countryCode],
			LastUpdated: time.Now().Format(time.RFC3339),
		}, nil
	}
	
	return nil, errors.New("country not found")
}

// SustainabilityAPI client for environmental impact data
type SustainabilityAPI struct{}

// NewSustainabilityAPI creates a new sustainability API client
func NewSustainabilityAPI() *SustainabilityAPI {
	return &SustainabilityAPI{}
}

// GetRouteEmissions retrieves emissions data for a specific route
func (api *SustainabilityAPI) GetRouteEmissions(origin, destination string) (*SustainabilityData, error) {
	// Mock implementation
	if len(origin) != 3 || len(destination) != 3 {
		return nil, errors.New("invalid airport code format")
	}
	
	// Simplified distance calculation (not accurate)
	distances := map[string]int{
		"JFK-LAX": 3983, "LAX-JFK": 3983,
		"LHR-JFK": 5541, "JFK-LHR": 5541,
		"CDG-DXB": 5246, "DXB-CDG": 5246,
		"SIN-SYD": 6293, "SYD-SIN": 6293,
	}
	
	route := fmt.Sprintf("%s-%s", origin, destination)
	distance := 0
	
	if dist, ok := distances[route]; ok {
		distance = dist
	} else {
		// Generate a plausible distance if not in our map
		distance = 1000 + rand.Intn(9000)
	}
	
	// CO2 calculation: ~0.2 kg per passenger km (simplified)
	co2 := float64(distance) * 0.2 * (0.9 + rand.Float64()*0.2) // +/- 10% variation
	
	ratings := []string{"A", "B", "C", "D", "E"}
	
	return &SustainabilityData{
		Route:           route,
		Distance:        distance,
		CO2Emissions:    co2,
		FuelEfficiency:  3.5 + rand.Float64()*2, // 3.5-5.5 liters per 100km per passenger
		AlternativeFuel: rand.Float64() < 0.3,    // 30% chance of alternative fuel
		NoiseLevel:      70 + rand.Intn(20),      // 70-90 dB
		EmissionsRating: ratings[rand.Intn(len(ratings))],
	}, nil
}

func init() {
	// Seed the random number generator
	rand.Seed(time.Now().UnixNano())
}

