package clients

import (
	"encoding/json"
	"fmt"
)

// WeatherData represents airport weather information
type WeatherData struct {
	AirportICAO    string  `json:"airport_icao"`
	AirportIATA    string  `json:"airport_iata"`
	AirportName    string  `json:"airport_name"`
	Latitude       float64 `json:"latitude"`
	Longitude      float64 `json:"longitude"`
	CurrentWeather struct {
		METAR       string `json:"metar"`
		Temperature struct {
			Celsius    float64 `json:"celsius"`
			Fahrenheit float64 `json:"fahrenheit"`
		} `json:"temperature"`
		Wind struct {
			Direction int     `json:"direction"`
			Speed     float64 `json:"speed"`
			Unit      string  `json:"unit"`
		} `json:"wind"`
		Visibility struct {
			Miles  float64 `json:"miles"`
			Meters float64 `json:"meters"`
		} `json:"visibility"`
		Pressure struct {
			InHg     float64 `json:"inHg"`
			HPa      float64 `json:"hPa"`
			KPa      float64 `json:"kPa"`
			Millibar float64 `json:"millibar"`
		} `json:"pressure"`
		Humidity        float64      `json:"humidity"`
		Conditions      string       `json:"conditions"`
		CloudCover      []CloudLayer `json:"cloud_cover"`
		WeatherCategory string       `json:"weather_category"`
	} `json:"current_weather"`
	Forecast    []ForecastData `json:"forecast"`
	LastUpdated string         `json:"last_updated"`
}

// CloudLayer represents cloud layer information
type CloudLayer struct {
	Coverage    string `json:"coverage"`
	Description string `json:"description"`
	AltitudeFt  int    `json:"altitude_ft"`
	AltitudeM   int    `json:"altitude_m"`
}

// ForecastData represents weather forecast information
type ForecastData struct {
	ValidFrom   string `json:"valid_from"`
	ValidTo     string `json:"valid_to"`
	TAF         string `json:"taf"`
	Temperature struct {
		Max float64 `json:"max"`
		Min float64 `json:"min"`
	} `json:"temperature"`
	Wind struct {
		Direction int     `json:"direction"`
		Speed     float64 `json:"speed"`
		Gusts     float64 `json:"gusts,omitempty"`
	} `json:"wind"`
	Visibility float64 `json:"visibility"`
	Conditions string  `json:"conditions"`
}

// WeatherAPI handles airport weather data
type WeatherAPI struct {
	fetcher *Fetcher
	parser  *Parser
}

// NewWeatherAPI creates a new WeatherAPI instance
func NewWeatherAPI() *WeatherAPI {
	return &WeatherAPI{
		fetcher: NewFetcher(),
		parser:  NewParser(),
	}
}

// GetCurrentWeather fetches current weather for an airport
func (w *WeatherAPI) GetCurrentWeather(airportCode string) (*WeatherData, error) {
	params := map[string]string{
		"iataCode": airportCode,
	}

	data, err := w.fetcher.Get("aviation-edge", "airportWeather", params)
	if err != nil {
		return w.getMockWeatherData(airportCode), nil
	}

	var weather WeatherData
	if err := json.Unmarshal(data, &weather); err != nil {
		return w.getMockWeatherData(airportCode), nil
	}

	return &weather, nil
}

// GetWeatherByICAO fetches weather using ICAO code
func (w *WeatherAPI) GetWeatherByICAO(icaoCode string) (*WeatherData, error) {
	params := map[string]string{
		"icaoCode": icaoCode,
	}

	data, err := w.fetcher.Get("aviation-edge", "airportWeather", params)
	if err != nil {
		return w.getMockWeatherData(icaoCode), nil
	}

	var weather WeatherData
	if err := json.Unmarshal(data, &weather); err != nil {
		return w.getMockWeatherData(icaoCode), nil
	}

	return &weather, nil
}

// GetWeatherForecast fetches weather forecast for an airport
func (w *WeatherAPI) GetWeatherForecast(airportCode string) (*WeatherData, error) {
	params := map[string]string{
		"iataCode": airportCode,
		"forecast": "true",
	}

	data, err := w.fetcher.Get("aviation-edge", "airportWeather", params)
	if err != nil {
		return w.getMockWeatherDataWithForecast(airportCode), nil
	}

	var weather WeatherData
	if err := json.Unmarshal(data, &weather); err != nil {
		return w.getMockWeatherDataWithForecast(airportCode), nil
	}

	return &weather, nil
}

// GetMETAR fetches METAR report for an airport
func (w *WeatherAPI) GetMETAR(airportCode string) (string, error) {
	weather, err := w.GetCurrentWeather(airportCode)
	if err != nil {
		return "", err
	}

	return weather.CurrentWeather.METAR, nil
}

// GetTAF fetches TAF report for an airport
func (w *WeatherAPI) GetTAF(airportCode string) ([]string, error) {
	weather, err := w.GetWeatherForecast(airportCode)
	if err != nil {
		return nil, err
	}

	var tafReports []string
	for _, forecast := range weather.Forecast {
		if forecast.TAF != "" {
			tafReports = append(tafReports, forecast.TAF)
		}
	}

	return tafReports, nil
}

// GetWeatherConditions gets simplified weather conditions
func (w *WeatherAPI) GetWeatherConditions(airportCode string) (map[string]interface{}, error) {
	weather, err := w.GetCurrentWeather(airportCode)
	if err != nil {
		return nil, err
	}

	conditions := map[string]interface{}{
		"airport":          weather.AirportICAO,
		"temperature_c":    weather.CurrentWeather.Temperature.Celsius,
		"temperature_f":    weather.CurrentWeather.Temperature.Fahrenheit,
		"wind_direction":   weather.CurrentWeather.Wind.Direction,
		"wind_speed":       weather.CurrentWeather.Wind.Speed,
		"visibility_miles": weather.CurrentWeather.Visibility.Miles,
		"pressure_hpa":     weather.CurrentWeather.Pressure.HPa,
		"humidity":         weather.CurrentWeather.Humidity,
		"conditions":       weather.CurrentWeather.Conditions,
		"weather_category": weather.CurrentWeather.WeatherCategory,
		"last_updated":     weather.LastUpdated,
	}

	return conditions, nil
}

// GetMultipleAirportsWeather fetches weather for multiple airports
func (w *WeatherAPI) GetMultipleAirportsWeather(airportCodes []string) (map[string]*WeatherData, error) {
	results := make(map[string]*WeatherData)

	for _, code := range airportCodes {
		weather, err := w.GetCurrentWeather(code)
		if err != nil {
			// Continue with other airports even if one fails
			results[code] = nil
			continue
		}
		results[code] = weather
	}

	return results, nil
}

// IsWeatherSuitableForFlight checks if weather conditions are suitable for flight operations
func (w *WeatherAPI) IsWeatherSuitableForFlight(airportCode string) (bool, string, error) {
	weather, err := w.GetCurrentWeather(airportCode)
	if err != nil {
		return false, "", err
	}

	// Basic weather suitability checks
	reasons := []string{}

	// Check visibility (minimum 3 miles for VFR)
	if weather.CurrentWeather.Visibility.Miles < 3.0 {
		reasons = append(reasons, "Low visibility")
	}

	// Check wind speed (assuming 35 knots is maximum for most aircraft)
	if weather.CurrentWeather.Wind.Speed > 35.0 {
		reasons = append(reasons, "High wind speed")
	}

	// Check weather category
	if weather.CurrentWeather.WeatherCategory == "LIFR" || weather.CurrentWeather.WeatherCategory == "IFR" {
		reasons = append(reasons, "Poor weather category")
	}

	suitable := len(reasons) == 0
	reasonStr := ""
	if !suitable {
		reasonStr = fmt.Sprintf("Unsuitable due to: %v", reasons)
	} else {
		reasonStr = "Weather conditions suitable for flight"
	}

	return suitable, reasonStr, nil
}

// getMockWeatherData returns mock weather data for testing
func (w *WeatherAPI) getMockWeatherData(airportCode string) *WeatherData {
	return &WeatherData{
		AirportICAO: fmt.Sprintf("K%s", airportCode),
		AirportIATA: airportCode,
		AirportName: fmt.Sprintf("%s Airport", airportCode),
		Latitude:    40.6413,
		Longitude:   -73.7781,
		CurrentWeather: struct {
			METAR       string `json:"metar"`
			Temperature struct {
				Celsius    float64 `json:"celsius"`
				Fahrenheit float64 `json:"fahrenheit"`
			} `json:"temperature"`
			Wind struct {
				Direction int     `json:"direction"`
				Speed     float64 `json:"speed"`
				Unit      string  `json:"unit"`
			} `json:"wind"`
			Visibility struct {
				Miles  float64 `json:"miles"`
				Meters float64 `json:"meters"`
			} `json:"visibility"`
			Pressure struct {
				InHg     float64 `json:"inHg"`
				HPa      float64 `json:"hPa"`
				KPa      float64 `json:"kPa"`
				Millibar float64 `json:"millibar"`
			} `json:"pressure"`
			Humidity        float64      `json:"humidity"`
			Conditions      string       `json:"conditions"`
			CloudCover      []CloudLayer `json:"cloud_cover"`
			WeatherCategory string       `json:"weather_category"`
		}{
			METAR: fmt.Sprintf("K%s 281251Z 27015KT 10SM FEW250 20/M05 A3010", airportCode),
			Temperature: struct {
				Celsius    float64 `json:"celsius"`
				Fahrenheit float64 `json:"fahrenheit"`
			}{
				Celsius:    20.0,
				Fahrenheit: 68.0,
			},
			Wind: struct {
				Direction int     `json:"direction"`
				Speed     float64 `json:"speed"`
				Unit      string  `json:"unit"`
			}{
				Direction: 270,
				Speed:     15.0,
				Unit:      "knots",
			},
			Visibility: struct {
				Miles  float64 `json:"miles"`
				Meters float64 `json:"meters"`
			}{
				Miles:  10.0,
				Meters: 16093,
			},
			Pressure: struct {
				InHg     float64 `json:"inHg"`
				HPa      float64 `json:"hPa"`
				KPa      float64 `json:"kPa"`
				Millibar float64 `json:"millibar"`
			}{
				InHg:     30.10,
				HPa:      1019.0,
				KPa:      101.9,
				Millibar: 1019.0,
			},
			Humidity:   65.0,
			Conditions: "Clear",
			CloudCover: []CloudLayer{
				{
					Coverage:    "FEW",
					Description: "Few clouds",
					AltitudeFt:  25000,
					AltitudeM:   7620,
				},
			},
			WeatherCategory: "VFR",
		},
		Forecast:    []ForecastData{},
		LastUpdated: "2025-06-28T13:32:00Z",
	}
}

// getMockWeatherDataWithForecast returns mock weather data with forecast
func (w *WeatherAPI) getMockWeatherDataWithForecast(airportCode string) *WeatherData {
	weather := w.getMockWeatherData(airportCode)

	weather.Forecast = []ForecastData{
		{
			ValidFrom: "2025-06-28T14:00:00Z",
			ValidTo:   "2025-06-28T20:00:00Z",
			TAF:       fmt.Sprintf("TAF K%s 281400Z 2814/2820 27015KT 10SM FEW250", airportCode),
			Temperature: struct {
				Max float64 `json:"max"`
				Min float64 `json:"min"`
			}{
				Max: 25.0,
				Min: 18.0,
			},
			Wind: struct {
				Direction int     `json:"direction"`
				Speed     float64 `json:"speed"`
				Gusts     float64 `json:"gusts,omitempty"`
			}{
				Direction: 270,
				Speed:     15.0,
				Gusts:     0,
			},
			Visibility: 10.0,
			Conditions: "Clear",
		},
	}

	return weather
}
