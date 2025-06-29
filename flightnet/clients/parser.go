package clients

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
)
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
		if data[0] == '[' {
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
		if data[0] == '[' {
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
