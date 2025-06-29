package clients

import (
	"encoding/json"
	"fmt"
	"log"
)

// Parser handles response parsing
type Parser struct{}

// NewParser creates a new Parser instance
func NewParser() *Parser {
	return &Parser{}
}

// ParseJSON parses JSON data into a struct
func (p *Parser) ParseJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

// ParseAircraftResponse handles special case for aircraft responses
func (p *Parser) ParseAircraftResponse(data []byte) ([]Aircraft, error) {
	log.Println("Parsing aircraft response, length:", len(data))

	// Try parsing as array
	var aircraftList []Aircraft
	err1 := json.Unmarshal(data, &aircraftList)
	if err1 == nil {
		log.Printf("Successfully parsed as array with %d items\n", len(aircraftList))
		return aircraftList, nil
	}
	log.Println("Error parsing as array:", err1)

	// Try parsing as single object
	var singleAircraft Aircraft
	err2 := json.Unmarshal(data, &singleAircraft)
	if err2 == nil {
		log.Println("Successfully parsed as single object")
		return []Aircraft{singleAircraft}, nil
	}
	log.Println("Error parsing as single object:", err2)

	// For large responses, try to extract a smaller subset
	if len(data) > 1000000 {
		log.Println("Response is very large, trying to extract first item from array")
		// Try to extract the first item from the array
		if len(data) > 0 && data[0] == '[' {
			// Find the end of the first object
			depth := 0
			for i := 1; i < len(data); i++ {
				if data[i] == '{' {
					depth++
				} else if data[i] == '}' {
					depth--
					if depth == 0 && i+1 < len(data) && data[i+1] == ',' {
						// Found the end of the first object
						firstObject := append([]byte{'['}, data[1:i+1]...)
						firstObject = append(firstObject, ']')

						var firstItem []Aircraft
						if err := json.Unmarshal(firstObject, &firstItem); err == nil {
							log.Println("Successfully parsed first item from array")
							return firstItem, nil
						} else {
							log.Println("Error parsing first item:", err)
						}
						break
					}
				}
			}
		}
	}

	return nil, fmt.Errorf("failed to parse aircraft response as array or object: %v, %v", err1, err2)
}

// ParseFlightResponse handles special case for flight responses
func (p *Parser) ParseFlightResponse(data []byte) ([]Flight, error) {
	log.Println("Parsing flight response, length:", len(data))

	// Try parsing as array
	var flightList []Flight
	err1 := json.Unmarshal(data, &flightList)
	if err1 == nil {
		log.Printf("Successfully parsed as array with %d items\n", len(flightList))
		return flightList, nil
	}
	log.Println("Error parsing as array:", err1)

	// Try parsing as single object
	var singleFlight Flight
	err2 := json.Unmarshal(data, &singleFlight)
	if err2 == nil {
		log.Println("Successfully parsed as single object")
		return []Flight{singleFlight}, nil
	}
	log.Println("Error parsing as single object:", err2)

	// For large responses, try to extract a smaller subset
	if len(data) > 1000000 {
		log.Println("Response is very large, trying to extract first item from array")
		// Try to extract the first item from the array
		if len(data) > 0 && data[0] == '[' {
			// Find the end of the first object
			depth := 0
			for i := 1; i < len(data); i++ {
				if data[i] == '{' {
					depth++
				} else if data[i] == '}' {
					depth--
					if depth == 0 && i+1 < len(data) && data[i+1] == ',' {
						// Found the end of the first object
						firstObject := append([]byte{'['}, data[1:i+1]...)
						firstObject = append(firstObject, ']')

						var firstItem []Flight
						if err := json.Unmarshal(firstObject, &firstItem); err == nil {
							log.Println("Successfully parsed first item from array")
							return firstItem, nil
						} else {
							log.Println("Error parsing first item:", err)
						}
						break
					}
				}
			}
		}
	}

	return nil, fmt.Errorf("failed to parse flight response as array or object: %v, %v", err1, err2)
}

// ParseWeatherResponse handles weather API responses
func (p *Parser) ParseWeatherResponse(data []byte) (*WeatherData, error) {
	log.Println("Parsing weather response, length:", len(data))

	var weather WeatherData
	if err := json.Unmarshal(data, &weather); err != nil {
		return nil, fmt.Errorf("failed to parse weather response: %w", err)
	}

	return &weather, nil
}

// ParseSustainabilityResponse handles sustainability API responses
func (p *Parser) ParseSustainabilityResponse(data []byte) (*SustainabilityData, error) {
	log.Println("Parsing sustainability response, length:", len(data))

	var sustainability SustainabilityData
	if err := json.Unmarshal(data, &sustainability); err != nil {
		return nil, fmt.Errorf("failed to parse sustainability response: %w", err)
	}

	return &sustainability, nil
}

// ParseGeopoliticalResponse handles geopolitical API responses
func (p *Parser) ParseGeopoliticalResponse(data []byte) (*GeopoliticalRisk, error) {
	log.Println("Parsing geopolitical response, length:", len(data))

	var risk GeopoliticalRisk
	if err := json.Unmarshal(data, &risk); err != nil {
		return nil, fmt.Errorf("failed to parse geopolitical response: %w", err)
	}

	return &risk, nil
}

// ParseGenericResponse handles generic JSON responses
func (p *Parser) ParseGenericResponse(data []byte) (map[string]interface{}, error) {
	log.Println("Parsing generic response, length:", len(data))

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse generic response: %w", err)
	}

	return result, nil
}

// ParseArrayResponse handles generic array responses
func (p *Parser) ParseArrayResponse(data []byte) ([]map[string]interface{}, error) {
	log.Println("Parsing array response, length:", len(data))

	var result []map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse array response: %w", err)
	}

	return result, nil
}

// ValidateJSON checks if the data is valid JSON
func (p *Parser) ValidateJSON(data []byte) error {
	var js json.RawMessage
	return json.Unmarshal(data, &js)
}

// PrettyPrintJSON formats JSON data for readable output
func (p *Parser) PrettyPrintJSON(data []byte) ([]byte, error) {
	var obj interface{}
	if err := json.Unmarshal(data, &obj); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	return json.MarshalIndent(obj, "", "  ")
}
