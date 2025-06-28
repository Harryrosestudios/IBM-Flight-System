# FlightNet API Client

A comprehensive Go client library for accessing multiple aviation-related APIs including flight data, aircraft information, weather conditions, geopolitical risk assessment, and sustainability metrics.

## Features

- **Aircraft Data**: Access comprehensive aircraft database with registration, model, and technical details
- **Flight Information**: Real-time and scheduled flight data with route information
- **Weather Data**: Current weather conditions and forecasts for airports worldwide
- **Geopolitical Risk**: Risk assessment and intelligence briefings for different regions
- **Sustainability Metrics**: CO2 emissions, fuel consumption, and efficiency calculations

## Supported APIs

### Aviation Edge API
- Aircraft Database
- Flight Tracking
- Airport Weather Conditions
- Weather Forecasts (METAR/TAF)

### ICAO Carbon Emissions Calculator API
- Flight CO2 emissions calculation
- Fuel consumption estimates
- Route-based emissions analysis

### Flight Fuel Consumption API
- Aircraft-specific fuel consumption
- Distance-based calculations
- CO2 emissions per flight

### RANE Network API (Enterprise)
- Geopolitical risk assessment
- Intelligence briefings
- Regional risk analysis

## Installation

go get github.com/yourusername/flightnet


## Configuration

Create a `.env` file in your project root with your API keys:

AVIATION_EDGE_API_KEY=your_aviation_edge_key
ICAO_API_KEY=your_icao_key
RANE_API_KEY=your_rane_token


## Usage Examples

### Aircraft Data

package main

import (
"fmt"
"log"
"github.com/yourusername/flightnet/clients"
)

func main() {
// Initialize aircraft API
aircraftAPI := clients.NewAircraftAPI()

// Get aircraft by registration
aircraft, err := aircraftAPI.GetAircraftByRegistration("N12345")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Aircraft: %s %s\n", aircraft.PlaneModel, aircraft.NumberRegistration)

// Search aircraft by parameters
params := map[string]string{
    "airlineIata": "AA",
    "limit": "10",
}

aircraftList, err := aircraftAPI.GetAircraft(params)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Found %d aircraft\n", len(aircraftList))

}


### Flight Information

// Initialize flights API
flightsAPI := clients.NewFlightsAPI()

// Get flights by route
flights, err := flightsAPI.GetFlightsByRoute("JFK", "LAX")
if err != nil {
log.Fatal(err)
}

for _, flight := range flights {
fmt.Printf("Flight %s: %s -> %s\n",
flight.Flight.Number,
flight.Departure.IataCode,
flight.Arrival.IataCode)
}

// Get future flights
futureFlights, err := flightsAPI.GetFutureFlights(map[string]string{
"depIata": "JFK",
"type": "departure",
})


### Weather Data

// Initialize weather API
weatherAPI := clients.NewWeatherAPI()

// Get current weather
weather, err := weatherAPI.GetCurrentWeather("JFK")
if err != nil {
log.Fatal(err)
}

fmt.Printf("Weather at %s: %.1f°C, Wind: %d° at %.1f kt\n",
weather.AirportICAO,
weather.CurrentWeather.Temperature.Celsius,
weather.CurrentWeather.Wind.Direction,
weather.CurrentWeather.Wind.Speed)

// Check flight suitability
suitable, reason, err := weatherAPI.IsWeatherSuitableForFlight("JFK")
if err != nil {
log.Fatal(err)
}

fmt.Printf("Flight suitable: %t - %s\n", suitable, reason)

// Get METAR report
metar, err := weatherAPI.GetMETAR("JFK")
if err != nil {
log.Fatal(err)
}
fmt.Printf("METAR: %s\n", metar)


### Sustainability Metrics

// Initialize sustainability API
sustainabilityAPI := clients.NewSustainabilityAPI()

// Get flight emissions
emissions, err := sustainabilityAPI.GetFlightEmissions("JFK", "LAX", "economy", "AA", "B738")
if err != nil {
log.Fatal(err)
}

fmt.Printf("Flight %s CO2 Emissions: %.2f kg (%.2f kg per seat)\n",
emissions.Route,
emissions.CO2Emissions.Total,
emissions.CO2Emissions.PerSeat)

// Get fuel consumption by aircraft
fuelData, err := sustainabilityAPI.GetFuelConsumption("A12345", "2500")
if err != nil {
log.Fatal(err)
}

fmt.Printf("Fuel consumption: %.2f kg, Efficiency score: %.1f\n",
fuelData.FuelConsumption.Total,
fuelData.EfficiencyScore)

// Compare aircraft efficiency
comparison, err := sustainabilityAPI.CompareAircraftEfficiency("A12345", "B67890", "2500")
if err != nil {
log.Fatal(err)
}

for aircraft, data := range comparison {
fmt.Printf("%s: %.2f kg CO2, Score: %.1f\n",
aircraft,
data.CO2Emissions.Total,
data.EfficiencyScore)
}


### Geopolitical Risk Assessment

// Initialize geopolitical API
geoAPI := clients.NewGeopoliticalAPI()

// Get country risk assessment
risk, err := geoAPI.GetCountryRisk("US")
if err != nil {
log.Fatal(err)
}

fmt.Printf("Risk for %s: %.2f (%s)\n",
risk.Country,
risk.RiskScore,
risk.RiskLevel)

// Get intelligence briefs
briefs, err := geoAPI.GetBriefs()
if err != nil {
log.Fatal(err)
}

for _, brief := range briefs {
fmt.Printf("Brief: %s - %s\n", brief.Title, brief.RiskLevel)
}

// Get regional risks
regionalRisks, err := geoAPI.GetRegionalRisks("Europe")
if err != nil {
log.Fatal(err)
}

for _, risk := range regionalRisks {
fmt.Printf("%s: %.2f\n", risk.Country, risk.RiskScore)
}


## API Endpoints Reference

### Aircraft API Endpoints

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/aircraft` | `airlineIata`, `numberRegistration`, `hexIcaoAirplane`, `limit` | Get aircraft data |
| GET | `/aircraft/registration/{reg}` | - | Get aircraft by registration |
| GET | `/aircraft/icao/{icao}` | - | Get aircraft by ICAO hex |

### Flights API Endpoints

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/flights` | `flightIata`, `airlineIata`, `depIata`, `arrIata`, `status` | Get current flights |
| GET | `/flights/future` | `depIata`, `arrIata`, `type` | Get scheduled flights |
| GET | `/flights/number/{number}` | - | Get flight by number |
| GET | `/flights/airline/{iata}` | - | Get flights by airline |
| GET | `/flights/airport/{iata}` | - | Get flights by airport |
| GET | `/flights/route/{dep}/{arr}` | - | Get flights by route |

### Weather API Endpoints

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/weather/current/{airport}` | - | Get current weather |
| GET | `/weather/icao/{icao}` | - | Get weather by ICAO |
| GET | `/weather/forecast/{airport}` | - | Get weather forecast |
| GET | `/weather/metar/{airport}` | - | Get METAR report |
| GET | `/weather/taf/{airport}` | - | Get TAF forecast |
| GET | `/weather/conditions/{airport}` | - | Get simplified conditions |
| GET | `/weather/suitable/{airport}` | - | Check flight suitability |
| POST | `/weather/multiple` | `airports: []string` | Get weather for multiple airports |

### Sustainability API Endpoints

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| POST | `/sustainability/emissions` | `origin`, `destination`, `cabin_class`, `airline`, `aircraft` | Calculate flight emissions |
| GET | `/sustainability/fuel/{aircraft}/{distance}` | `gcd` (optional) | Get fuel consumption |
| GET | `/sustainability/efficiency/{aircraft}` | - | Get aircraft efficiency |
| GET | `/sustainability/route/{origin}/{destination}` | - | Get route emissions |
| POST | `/sustainability/compare` | `aircraft1`, `aircraft2`, `distance` | Compare aircraft efficiency |

### Geopolitical API Endpoints

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/geopolitical/risk/{country}` |
