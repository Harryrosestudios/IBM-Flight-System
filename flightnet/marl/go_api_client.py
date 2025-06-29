import requests
import json
from typing import Dict, List, Any, Optional
import logging

class GoAPIClient:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def get_flight_environment_data(self, route: Optional[str] = None, aircraft_count: int = 5) -> Dict[str, Any]:
        """Get comprehensive flight environment data from Go API clients"""
        params = {"aircraft_count": aircraft_count}
        if route:
            params["route"] = route
            
        try:
            response = self.session.get(
                f"{self.base_url}/flight-environment",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logging.error(f"Error fetching flight environment data: {e}")
            return self._get_mock_data()
    
    def _get_mock_data(self) -> Dict[str, Any]:
        """Fallback mock data when Go API is unavailable"""
        return {
            "aircraft": [
                {
                    "airplaneId": "mock-1",
                    "numberRegistration": "N12345",
                    "planeModel": "Boeing 737-800",
                    "codeIataAirline": "AA"
                }
            ],
            "flights": [
                {
                    "flight": {"number": "AA123"},
                    "departure": {"iataCode": "JFK"},
                    "arrival": {"iataCode": "LAX"},
                    "status": "active"
                }
            ],
            "weather": {
                "JFK": {
                    "airport_icao": "KJFK",
                    "current_weather": {
                        "temperature": {"celsius": 20.0},
                        "wind": {"direction": 270, "speed": 15.0},
                        "visibility": {"miles": 10.0}
                    }
                }
            },
            "geopolitical": {
                "IR": {"country": "IR", "risk_score": 0.8, "risk_level": "High"},
                "RU": {"country": "RU", "risk_score": 0.7, "risk_level": "High"}
            },
            "no_fly_zones": ["IR", "RU"],
            "timestamp": "2025-06-29T13:32:00Z"
        }
    
    def health_check(self) -> bool:
        """Check if Go API bridge is healthy"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False

