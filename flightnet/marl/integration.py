import numpy as np
from typing import Dict, List, Set
from .go_api_client import GoAPIClient
from .main_algorithm import InternationalFlightOptimizer, create_aircraft, create_crew_costs_by_region

class EnhancedFlightOptimizer:
    def __init__(self):
        self.go_client = GoAPIClient()
        self.aircraft = create_aircraft()
        self.crew_costs = create_crew_costs_by_region("US")  # Default to US
        self.optimizer = InternationalFlightOptimizer(self.aircraft, self.crew_costs)
        
    def get_real_time_constraints(self, route: str) -> Dict[str, Any]:
        """Get real-time constraints from Go API clients"""
        env_data = self.go_client.get_flight_environment_data(route=route)
        
        constraints = {
            "no_fly_zones": set(env_data.get("no_fly_zones", [])),
            "weather_restrictions": self._extract_weather_restrictions(env_data.get("weather", {})),
            "geopolitical_risks": self._extract_geopolitical_risks(env_data.get("geopolitical", {})),
            "sustainability_targets": self._extract_sustainability_targets(env_data.get("sustainability", {})),
            "aircraft_availability": self._extract_aircraft_availability(env_data.get("aircraft", [])),
            "current_flights": env_data.get("flights", [])
        }
        
        return constraints
    
    def _extract_weather_restrictions(self, weather_data: Dict) -> Set[str]:
        """Extract airports with poor weather conditions"""
        restricted_airports = set()
        
        for airport, data in weather_data.items():
            if data and "current_weather" in data:
                weather = data["current_weather"]
                
                # Check visibility
                if weather.get("visibility", {}).get("miles", 10) < 3:
                    restricted_airports.add(airport)
                
                # Check wind speed
                if weather.get("wind", {}).get("speed", 0) > 35:
                    restricted_airports.add(airport)
        
        return restricted_airports
    
    def _extract_geopolitical_risks(self, geo_data: Dict) -> Dict[str, float]:
        """Extract geopolitical risk scores by country"""
        risks = {}
        for country, data in geo_data.items():
            if data:
                risks[country] = data.get("risk_score", 0.5)
        return risks
    
    def _extract_sustainability_targets(self, sustainability_data: Dict) -> Dict[str, float]:
        """Extract sustainability metrics for optimization"""
        targets = {}
        for route, data in sustainability_data.items():
            if data:
                targets[route] = {
                    "co2_per_km": data.get("co2_emissions", {}).get("per_km", 0),
                    "efficiency_score": data.get("efficiency_score", 50)
                }
        return targets
    
    def _extract_aircraft_availability(self, aircraft_data: List) -> List[str]:
        """Extract available aircraft models"""
        return [aircraft.get("planeModel", "") for aircraft in aircraft_data if aircraft.get("planeStatus") == "active"]
    
    def optimize_route_with_real_time_data(self, start_code: str, dest_code: str) -> Dict[str, Any]:
        """Optimize route using real-time data from Go APIs"""
        route = f"{start_code}-{dest_code}"
        constraints = self.get_real_time_constraints(route)
        
        # Apply constraints to optimizer
        no_fly_zones = constraints["no_fly_zones"]
        weather_restrictions = constraints["weather_restrictions"]
        
        # Combine no-fly zones with weather restrictions
        all_restrictions = no_fly_zones.union(weather_restrictions)
        
        # Get optimized routes
        routes = self.optimizer.compare_routes(start_code.upper(), dest_code.upper())
        
        # Enhance routes with real-time data
        enhanced_routes = {}
        for mode, route_data in routes.items():
            if "error" not in route_data:
                enhanced_routes[mode] = self._enhance_route_with_constraints(
                    route_data, constraints, all_restrictions
                )
            else:
                enhanced_routes[mode] = route_data
        
        return {
            "routes": enhanced_routes,
            "constraints_applied": {
                "no_fly_zones": list(no_fly_zones),
                "weather_restrictions": list(weather_restrictions),
                "geopolitical_risks": constraints["geopolitical_risks"]
            },
            "real_time_data_timestamp": self.go_client.get_flight_environment_data().get("timestamp")
        }
    
    def _enhance_route_with_constraints(self, route_data: Dict, constraints: Dict, restrictions: Set[str]) -> Dict[str, Any]:
        """Enhance route data with real-time constraint analysis"""
        enhanced = route_data.copy()
        
        # Add constraint violations
        violations = []
        for segment in route_data.get("flight_segments", []):
            from_code = segment.get("from", {}).get("code", "")
            to_code = segment.get("to", {}).get("code", "")
            
            if from_code in restrictions:
                violations.append(f"Departure from restricted area: {from_code}")
            if to_code in restrictions:
                violations.append(f"Arrival at restricted area: {to_code}")
        
        enhanced["constraint_violations"] = violations
        enhanced["safety_score"] = self._calculate_safety_score(route_data, constraints)
        enhanced["sustainability_score"] = self._calculate_sustainability_score(route_data, constraints)
        
        return enhanced
    
    def _calculate_safety_score(self, route_data: Dict, constraints: Dict) -> float:
        """Calculate safety score based on geopolitical risks and weather"""
        base_score = 100.0
        geo_risks = constraints.get("geopolitical_risks", {})
        
        for segment in route_data.get("flight_segments", []):
            from_country = segment.get("from", {}).get("country", "")
            to_country = segment.get("to", {}).get("country", "")
            
            # Deduct points for high-risk countries
            if from_country in geo_risks:
                base_score -= geo_risks[from_country] * 20
            if to_country in geo_risks:
                base_score -= geo_risks[to_country] * 20
        
        return max(0, min(100, base_score))
    
    def _calculate_sustainability_score(self, route_data: Dict, constraints: Dict) -> float:
        """Calculate sustainability score"""
        # This would use the sustainability data from your sustainability API
        # For now, return a placeholder based on distance
        total_distance = route_data.get("route_overview", {}).get("total_distance_km", 0)
        
        # Shorter routes are generally more sustainable
        if total_distance < 1000:
            return 90.0
        elif total_distance < 5000:
            return 70.0
        else:
            return 50.0
