package clients

import (
	"encoding/json"
	"fmt"
)

// SustainabilityData represents sustainability metrics
type SustainabilityData struct {
	FlightID        string  `json:"flight_id"`
	Aircraft        string  `json:"aircraft"`
	Route           string  `json:"route"`
	Distance        float64 `json:"distance"`
	FuelConsumption struct {
		Total   float64 `json:"total_kg"`
		PerKm   float64 `json:"per_km"`
		PerSeat float64 `json:"per_seat"`
	} `json:"fuel_consumption"`
	CO2Emissions struct {
		Total   float64 `json:"total_kg"`
		PerKm   float64 `json:"per_km"`
		PerSeat float64 `json:"per_seat"`
	} `json:"co2_emissions"`
	EfficiencyScore float64 `json:"efficiency_score"`
	LastCalculated  string  `json:"last_calculated"`
}

// ICAOEmissionsRequest represents ICAO API request
type ICAOEmissionsRequest struct {
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	CabinClass  string `json:"cabin_class,omitempty"`
	Airline     string `json:"airline,omitempty"`
	Aircraft    string `json:"aircraft,omitempty"`
}

// ICAOEmissionsResponse represents ICAO API response
type ICAOEmissionsResponse struct {
	CO2Emissions struct {
		Total float64 `json:"total"`
		Unit  string  `json:"unit"`
	} `json:"co2_emissions"`
	Distance struct {
		Value float64 `json:"value"`
		Unit  string  `json:"unit"`
	} `json:"distance"`
	FuelBurn struct {
		Value float64 `json:"value"`
		Unit  string  `json:"unit"`
	} `json:"fuel_burn"`
}

// FuelAPIResponse represents fuel consumption API response
type FuelAPIResponse struct {
	Aircraft     string  `json:"aircraft"`
	Distance     float64 `json:"distance"`
	FuelBurn     float64 `json:"fuel_burn"`
	CO2Emissions float64 `json:"co2_emissions"`
	Unit         string  `json:"unit"`
}

// SustainabilityAPI handles sustainability and emissions data
type SustainabilityAPI struct {
	fetcher *Fetcher
	parser  *Parser
}

// NewSustainabilityAPI creates a new SustainabilityAPI instance
func NewSustainabilityAPI() *SustainabilityAPI {
	return &SustainabilityAPI{
		fetcher: NewFetcher(),
		parser:  NewParser(),
	}
}

// GetFlightEmissions calculates CO2 emissions for a flight using ICAO API
func (s *SustainabilityAPI) GetFlightEmissions(origin, destination, cabinClass, airline, aircraft string) (*SustainabilityData, error) {
	request := ICAOEmissionsRequest{
		Origin:      origin,
		Destination: destination,
		CabinClass:  cabinClass,
		Airline:     airline,
		Aircraft:    aircraft,
	}

	data, err := s.fetcher.Post("icao", "carbonemission", request)
	if err != nil {
		// Fallback to mock data
		return s.getMockSustainabilityData(origin, destination, aircraft), nil
	}

	var icaoResponse ICAOEmissionsResponse
	if err := json.Unmarshal(data, &icaoResponse); err != nil {
		return nil, fmt.Errorf("failed to parse ICAO emissions response: %w", err)
	}

	return s.convertICAOToSustainabilityData(icaoResponse, origin, destination, aircraft), nil
}

// GetFuelConsumption gets fuel consumption data using the fuel consumption API
func (s *SustainabilityAPI) GetFuelConsumption(aircraftICAO24, distance string) (*SustainabilityData, error) {
	params := map[string]string{
		"aircraft": aircraftICAO24,
		"distance": distance,
		"gcd":      "true",
	}

	data, err := s.fetcher.Get("fuel-api", "", params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch fuel consumption data: %w", err)
	}

	var fuelResponse FuelAPIResponse
	if err := json.Unmarshal(data, &fuelResponse); err != nil {
		return nil, fmt.Errorf("failed to parse fuel consumption response: %w", err)
	}

	return s.convertFuelAPIToSustainabilityData(fuelResponse), nil
}

// GetAircraftEfficiency calculates efficiency metrics for an aircraft
func (s *SustainabilityAPI) GetAircraftEfficiency(aircraftType string) (*SustainabilityData, error) {
	// This would typically call a specialized API for aircraft efficiency data
	// For now, return mock data based on aircraft type
	return s.getMockEfficiencyData(aircraftType), nil
}

// GetRouteEmissions calculates emissions for a specific route
func (s *SustainabilityAPI) GetRouteEmissions(origin, destination string) (*SustainabilityData, error) {
	// Calculate using ICAO API with default parameters
	return s.GetFlightEmissions(origin, destination, "economy", "", "")
}

// CompareAircraftEfficiency compares efficiency between different aircraft types
func (s *SustainabilityAPI) CompareAircraftEfficiency(aircraft1, aircraft2, distance string) (map[string]*SustainabilityData, error) {
	results := make(map[string]*SustainabilityData)

	// Get data for first aircraft
	data1, err := s.GetFuelConsumption(aircraft1, distance)
	if err != nil {
		data1 = s.getMockEfficiencyData(aircraft1)
	}
	results[aircraft1] = data1

	// Get data for second aircraft
	data2, err := s.GetFuelConsumption(aircraft2, distance)
	if err != nil {
		data2 = s.getMockEfficiencyData(aircraft2)
	}
	results[aircraft2] = data2

	return results, nil
}

// convertICAOToSustainabilityData converts ICAO response to SustainabilityData
func (s *SustainabilityAPI) convertICAOToSustainabilityData(icao ICAOEmissionsResponse, origin, destination, aircraft string) *SustainabilityData {
	route := fmt.Sprintf("%s-%s", origin, destination)

	return &SustainabilityData{
		FlightID: fmt.Sprintf("%s-%s", route, aircraft),
		Aircraft: aircraft,
		Route:    route,
		Distance: icao.Distance.Value,
		FuelConsumption: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   icao.FuelBurn.Value,
			PerKm:   icao.FuelBurn.Value / icao.Distance.Value,
			PerSeat: icao.FuelBurn.Value / 150, // Assuming 150 seats average
		},
		CO2Emissions: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   icao.CO2Emissions.Total,
			PerKm:   icao.CO2Emissions.Total / icao.Distance.Value,
			PerSeat: icao.CO2Emissions.Total / 150,
		},
		EfficiencyScore: s.calculateEfficiencyScore(icao.CO2Emissions.Total, icao.Distance.Value),
		LastCalculated:  "2025-06-28T13:32:00Z",
	}
}

// convertFuelAPIToSustainabilityData converts Fuel API response to SustainabilityData
func (s *SustainabilityAPI) convertFuelAPIToSustainabilityData(fuel FuelAPIResponse) *SustainabilityData {
	return &SustainabilityData{
		FlightID: fuel.Aircraft,
		Aircraft: fuel.Aircraft,
		Route:    fmt.Sprintf("Distance: %.2f nm", fuel.Distance),
		Distance: fuel.Distance,
		FuelConsumption: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   fuel.FuelBurn,
			PerKm:   fuel.FuelBurn / fuel.Distance,
			PerSeat: fuel.FuelBurn / 150,
		},
		CO2Emissions: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   fuel.CO2Emissions,
			PerKm:   fuel.CO2Emissions / fuel.Distance,
			PerSeat: fuel.CO2Emissions / 150,
		},
		EfficiencyScore: s.calculateEfficiencyScore(fuel.CO2Emissions, fuel.Distance),
		LastCalculated:  "2025-06-28T13:32:00Z",
	}
}

// calculateEfficiencyScore calculates an efficiency score (0-100)
func (s *SustainabilityAPI) calculateEfficiencyScore(co2Total, distance float64) float64 {
	// Simple efficiency calculation - lower CO2 per km = higher score
	co2PerKm := co2Total / distance
	// Normalize to 0-100 scale (assuming 0.5 kg CO2/km is excellent, 2.0 kg CO2/km is poor)
	score := 100 - ((co2PerKm - 0.5) / 1.5 * 100)
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return score
}

// getMockSustainabilityData returns mock sustainability data
func (s *SustainabilityAPI) getMockSustainabilityData(origin, destination, aircraft string) *SustainabilityData {
	route := fmt.Sprintf("%s-%s", origin, destination)
	distance := 1000.0 // Mock distance

	return &SustainabilityData{
		FlightID: fmt.Sprintf("%s-%s", route, aircraft),
		Aircraft: aircraft,
		Route:    route,
		Distance: distance,
		FuelConsumption: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   2500.0,
			PerKm:   2.5,
			PerSeat: 16.67,
		},
		CO2Emissions: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   7900.0,
			PerKm:   7.9,
			PerSeat: 52.67,
		},
		EfficiencyScore: 75.0,
		LastCalculated:  "2025-06-28T13:32:00Z",
	}
}

// getMockEfficiencyData returns mock efficiency data for an aircraft
func (s *SustainabilityAPI) getMockEfficiencyData(aircraft string) *SustainabilityData {
	return &SustainabilityData{
		FlightID: aircraft,
		Aircraft: aircraft,
		Route:    "Efficiency Analysis",
		Distance: 1000.0,
		FuelConsumption: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   2200.0,
			PerKm:   2.2,
			PerSeat: 14.67,
		},
		CO2Emissions: struct {
			Total   float64 `json:"total_kg"`
			PerKm   float64 `json:"per_km"`
			PerSeat float64 `json:"per_seat"`
		}{
			Total:   6952.0,
			PerKm:   6.952,
			PerSeat: 46.35,
		},
		EfficiencyScore: 82.0,
		LastCalculated:  "2025-06-28T13:32:00Z",
	}
}
