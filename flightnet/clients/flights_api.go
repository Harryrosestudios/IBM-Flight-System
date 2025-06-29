package clients

import (
	"encoding/json"
	"errors"
)

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

// FlightsAPI handles flight data
type FlightsAPI struct {
	fetcher *Fetcher
	parser  *Parser
}

// NewFlightsAPI creates a new FlightsAPI instance
func NewFlightsAPI() *FlightsAPI {
	return &FlightsAPI{
		fetcher: NewFetcher(),
		parser:  NewParser(),
	}
}

// GetFlights fetches flight data
func (f *FlightsAPI) GetFlights(params map[string]string) ([]Flight, error) {
	data, err := f.fetcher.Get("flights", params)
	if err != nil {
		return nil, err
	}

	// Try parsing as array
	var flightList []Flight
	if err := json.Unmarshal(data, &flightList); err == nil {
		return flightList, nil
	}

	// Try parsing as single object
	var singleFlight Flight
	if err := json.Unmarshal(data, &singleFlight); err == nil {
		return []Flight{singleFlight}, nil
	}

	return nil, errors.New("failed to parse flight response as array or object")
}

// GetFutureFlights fetches future flight schedules
func (f *FlightsAPI) GetFutureFlights(params map[string]string) ([]Flight, error) {
	data, err := f.fetcher.Get("flightsFuture", params)
	if err != nil {
		return nil, err
	}

	// Try parsing as array
	var flightList []Flight
	if err := json.Unmarshal(data, &flightList); err == nil {
		return flightList, nil
	}

	// Try parsing as single object
	var singleFlight Flight
	if err := json.Unmarshal(data, &singleFlight); err == nil {
		return []Flight{singleFlight}, nil
	}

	return nil, errors.New("failed to parse flight response as array or object")
}

