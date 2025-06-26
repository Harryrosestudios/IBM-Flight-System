package client

import (
	"time"
)

// Parsed data structures
type ParsedWeather struct {
	TurbulenceSeverity string    `json:"turbulence_severity"`
	ForecastTime       time.Time `json:"forecast_time"`
	WindPatterns       string    `json:"wind_patterns"`
}

type ParsedGeopolitical struct {
	RiskLevel          string   `json:"risk_level"`
	AirspaceRestricted bool     `json:"airspace_restricted"`
	ThreatTypes        []string `json:"threat_types"`
}

type ParsedAircraft struct {
	Registration   string  `json:"registration"`
	CurrentAltitude int     `json:"current_altitude"`
	GroundSpeed    float64 `json:"ground_speed"`
}

type ParsedSustainability struct {
	CO2Emissions  float64 `json:"co2_emissions"`
	FuelEfficiency float64 `json:"fuel_efficiency"`
}

// Unified parsed output
type ParsedFlightData struct {
	Weather       ParsedWeather       `json:"weather"`
	Geopolitical  ParsedGeopolitical  `json:"geopolitical"`
	Aircraft      ParsedAircraft      `json:"aircraft"`
	Sustainability ParsedSustainability `json:"sustainability"`
}

// Parser service
type Parser struct{}

func NewParser() *Parser {
	return &Parser{}
}

func (p *Parser) Parse(raw *FlightData) *ParsedFlightData {
	parsed := &ParsedFlightData{}
	
	if raw.Weather != nil {
		parsed.Weather = ParsedWeather{
			TurbulenceSeverity: raw.Weather.Forecast.Turbulence.Severity,
			ForecastTime:       raw.Weather.Timestamp,
			WindPatterns:       raw.Weather.Wind.Pattern,
		}
	}
	
	if raw.Geopolitical != nil {
		parsed.Geopolitical = ParsedGeopolitical{
			RiskLevel:          raw.Geopolitical.RiskAssessment.Level,
			AirspaceRestricted: raw.Geopolitical.AirspaceRestrictions.Active,
			ThreatTypes:        raw.Geopolitical.ThreatTypes,
		}
	}
	
	if raw.Aircraft != nil {
		parsed.Aircraft = ParsedAircraft{
			Registration:   raw.Aircraft.Registration,
			CurrentAltitude: raw.Aircraft.Altitude,
			GroundSpeed:    raw.Aircraft.Speed,
		}
	}
	
	if raw.Sustainability != nil {
		parsed.Sustainability = ParsedSustainability{
			CO2Emissions:  raw.Sustainability.Emissions.CO2,
			FuelEfficiency: raw.Sustainability.FuelEfficiency,
		}
	}
	
	return parsed
}

