from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Set, Dict, Any, Optional
import numpy as np
import requests
import logging
import json
from datetime import datetime
import asyncio
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicy
from flightnet.marl.main_algorithm import (
    create_aircraft,
    create_crew_costs_by_region,
    InternationalFlightOptimizer,
    get_airports,
)
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FlightNet MARL API",
    description="Multi-Agent Reinforcement Learning API for Flight Route Optimization",
    version="1.0.0"
)

class RouteRequest(BaseModel):
    start_code: str
    dest_code: str
    crew_region: str = "US"
    no_fly_zones: Set[str] = set()
    use_real_time_data: bool = True
    aircraft_count: int = 5

class EnhancedRouteRequest(BaseModel):
    start_code: str
    dest_code: str
    crew_region: str = "US"
    use_real_time_data: bool = True
    aircraft_count: int = 5
    weather_constraints: bool = True
    geopolitical_analysis: bool = True
    sustainability_optimization: bool = True
    news_analysis: bool = True

class FlightAnalysisRequest(BaseModel):
    routes: List[str]  # e.g., ["JFK-LAX", "LHR-DXB"]
    analysis_type: str = "comprehensive"  # "basic", "comprehensive", "sustainability"
    include_alternatives: bool = True

class GoAPIClient:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 30
        
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
            logger.error(f"Error fetching flight environment data: {e}")
            return self._get_mock_data()
    
    def health_check(self) -> bool:
        """Check if Go API bridge is healthy"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
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
            "timestamp": datetime.now().isoformat()
        }

class EnhancedFlightOptimizer:
    def __init__(self):
        self.go_client = GoAPIClient()
        self.aircraft = create_aircraft()
        self.crew_costs = create_crew_costs_by_region("US")
        self.optimizer = InternationalFlightOptimizer(self.aircraft, self.crew_costs)
        self._setup_airports()
        
    def _setup_airports(self):
        """Setup airports in the optimizer"""
        airports = get_airports()
        for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
            self.optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)
    
    def get_real_time_constraints(self, route: str) -> Dict[str, Any]:
        """Get real-time constraints from Go API clients"""
        env_data = self.go_client.get_flight_environment_data(route=route)
        
        constraints = {
            "no_fly_zones": set(env_data.get("no_fly_zones", [])),
            "weather_restrictions": self._extract_weather_restrictions(env_data.get("weather", {})),
            "geopolitical_risks": self._extract_geopolitical_risks(env_data.get("geopolitical", {})),
            "sustainability_targets": self._extract_sustainability_targets(env_data.get("sustainability", {})),
            "aircraft_availability": self._extract_aircraft_availability(env_data.get("aircraft", [])),
            "current_flights": env_data.get("flights", []),
            "news_alerts": self._extract_news_alerts(env_data.get("news", {}))
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
    
    def _extract_news_alerts(self, news_data: Dict) -> List[str]:
        """Extract relevant news alerts"""
        alerts = []
        if news_data and "articles" in news_data:
            for article in news_data["articles"][:5]:  # Top 5 articles
                if any(keyword in article.get("title", "").lower() for keyword in ["conflict", "airspace", "restriction", "military"]):
                    alerts.append(article.get("title", ""))
        return alerts
    
    def optimize_route_with_real_time_data(self, start_code: str, dest_code: str, crew_region: str = "US") -> Dict[str, Any]:
        """Optimize route using real-time data from Go APIs"""
        route = f"{start_code}-{dest_code}"
        constraints = self.get_real_time_constraints(route)
        
        # Apply constraints to optimizer
        no_fly_zones = constraints["no_fly_zones"]
        weather_restrictions = constraints["weather_restrictions"]
        
        # Update crew costs if different region
        if crew_region != "US":
            self.crew_costs = create_crew_costs_by_region(crew_region)
            self.optimizer = InternationalFlightOptimizer(self.aircraft, self.crew_costs)
            self._setup_airports()
        
        # Combine no-fly zones with weather restrictions
        all_restrictions = no_fly_zones.union(weather_restrictions)
        
        # Patch the optimizer to respect no-fly zones
        orig_can_fly_direct = self.optimizer.can_fly_direct
        
        def patched_can_fly_direct(from_id, to_id):
            if from_id in all_restrictions or to_id in all_restrictions:
                return False
            return orig_can_fly_direct(from_id, to_id)
        
        self.optimizer.can_fly_direct = patched_can_fly_direct.__get__(self.optimizer, InternationalFlightOptimizer)
        
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
                "geopolitical_risks": constraints["geopolitical_risks"],
                "news_alerts": constraints["news_alerts"]
            },
            "real_time_data_timestamp": self.go_client.get_flight_environment_data().get("timestamp"),
            "go_api_status": "healthy" if self.go_client.health_check() else "unavailable"
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
        enhanced["real_time_analysis"] = {
            "weather_impact": len([seg for seg in route_data.get("flight_segments", []) 
                                 if seg.get("from", {}).get("code") in constraints.get("weather_restrictions", set())]),
            "geopolitical_risk_level": self._assess_route_geopolitical_risk(route_data, constraints),
            "news_relevance": len(constraints.get("news_alerts", []))
        }
        
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
        total_distance = route_data.get("route_overview", {}).get("total_distance_km", 0)
        
        # Base score on distance efficiency
        if total_distance < 1000:
            base_score = 90.0
        elif total_distance < 5000:
            base_score = 70.0
        else:
            base_score = 50.0
        
        # Adjust for sustainability targets
        sustainability_targets = constraints.get("sustainability_targets", {})
        if sustainability_targets:
            avg_efficiency = sum(target.get("efficiency_score", 50) for target in sustainability_targets.values()) / len(sustainability_targets)
            base_score = (base_score + avg_efficiency) / 2
        
        return base_score
    
    def _assess_route_geopolitical_risk(self, route_data: Dict, constraints: Dict) -> str:
        """Assess overall geopolitical risk level for the route"""
        geo_risks = constraints.get("geopolitical_risks", {})
        max_risk = 0.0
        
        for segment in route_data.get("flight_segments", []):
            from_country = segment.get("from", {}).get("country", "")
            to_country = segment.get("to", {}).get("country", "")
            
            max_risk = max(max_risk, geo_risks.get(from_country, 0), geo_risks.get(to_country, 0))
        
        if max_risk > 0.7:
            return "HIGH"
        elif max_risk > 0.5:
            return "MEDIUM"
        else:
            return "LOW"

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth"""
    R = 6371  # Radius of earth in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2*R*math.asin(math.sqrt(a))

class SingleAgentWrapperPredict:
    def __init__(self, start, dest):
        self.env = MultiAircraftEnv(num_agents=1)
        self.env.reset()
        self.env.positions[0] = np.array(start)
        self.env.destinations[0] = np.array(dest)
        self.obs = self.env._get_obs(0)
        self.done = False

    def step(self, action):
        obs, rewards, dones, infos = self.env.step([action])
        self.obs = obs[0]
        self.done = dones[0]
        return self.obs, rewards[0], self.done, infos[0]

def predict_segment_path(model, start, dest, max_steps=200):
    """Predict flight path segment using RL model"""
    env = SingleAgentWrapperPredict(start, dest)
    obs = env.obs
    path = [list(start)]
    rewards = []
    
    for step in range(max_steps):
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, done, info = env.step(action)
        pos = env.env.positions[0].tolist()
        path.append(pos)
        rewards.append(reward)
        if done:
            break
    
    return path, rewards

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    go_client = GoAPIClient()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "go_api_bridge": "healthy" if go_client.health_check() else "unavailable",
        "marl_system": "operational"
    }

@app.post("/predict_route")
async def predict_route(req: RouteRequest):
    """Original route prediction endpoint (legacy support)"""
    try:
        aircraft = create_aircraft()
        crew_costs = create_crew_costs_by_region(req.crew_region)
        optimizer = InternationalFlightOptimizer(aircraft, crew_costs)
        
        airports = get_airports()
        for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
            optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)

        # Apply no-fly zones
        orig_can_fly_direct = optimizer.can_fly_direct

        def patched_can_fly_direct(self, from_id, to_id):
            if from_id in req.no_fly_zones or to_id in req.no_fly_zones:
                return False
            return orig_can_fly_direct(from_id, to_id)

        optimizer.can_fly_direct = patched_can_fly_direct.__get__(optimizer, InternationalFlightOptimizer)

        routes = optimizer.compare_routes(req.start_code.upper(), req.dest_code.upper())

        # Load RL model
        model_path = "flightnet/models/single_agent_policy.zip"
        try:
            model = PPO.load(model_path, custom_objects={"policy_class": CustomMLPPolicy})
        except Exception as e:
            logger.warning(f"Could not load RL model: {e}. Using basic optimization only.")
            model = None

        results = {}
        for mode in ["cheapest", "fastest"]:
            route = routes[mode]
            if "error" in route:
                results[mode] = {"error": route["error"]}
                continue

            overview = route['route_overview']
            costs = route['detailed_cost_breakdown']
            segs = []
            
            for seg in route['flight_segments']:
                from_code = seg['from']['code']
                to_code = seg['to']['code']
                
                seg_data = {
                    "from": from_code,
                    "to": to_code,
                    "distance_km": seg['distance_km'],
                    "refuel": "REFUEL" if seg['refuel_info']['requires_refuel'] else "",
                    "no_fly_zone_violation": from_code in req.no_fly_zones or to_code in req.no_fly_zones
                }
                
                # Add RL prediction if model is available
                if model:
                    try:
                        start = (optimizer.airports[from_code].lat, optimizer.airports[from_code].lon, 10000)
                        dest = (optimizer.airports[to_code].lat, optimizer.airports[to_code].lon, 10000)
                        path, rewards = predict_segment_path(model, start, dest, max_steps=300)
                        seg_data.update({
                            "steps": len(path),
                            "rl_reward": float(np.sum(rewards))
                        })
                    except Exception as e:
                        logger.warning(f"RL prediction failed for segment {from_code}-{to_code}: {e}")
                        seg_data.update({"steps": 0, "rl_reward": 0.0})
                
                segs.append(seg_data)

            results[mode] = {
                "route": overview['route_path'],
                "total_cost_usd": overview['total_cost_usd'],
                "total_flight_time_hours": overview['total_flight_time_hours'],
                "total_distance_km": overview['total_distance_km'],
                "number_of_stops": overview['number_of_stops'],
                "crew_cost_structure": overview['crew_cost_structure'],
                "cost_breakdown": {
                    "fuel": costs['fuel_cost_usd'],
                    "landing_fees": costs['landing_fees_usd'],
                    "crew": costs['crew_cost_usd'],
                    "maintenance": costs['maintenance_cost_usd'],
                    "other": costs['depreciation_cost_usd'] + costs['insurance_cost_usd'] + costs['navigation_fees_usd'] + costs['ground_handling_cost_usd']
                },
                "segments": segs
            }

        return results
    
    except Exception as e:
        logger.error(f"Error in predict_route: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_route_enhanced")
async def predict_route_enhanced(req: EnhancedRouteRequest):
    """Enhanced route prediction using real-time data from Go APIs"""
    try:
        optimizer = EnhancedFlightOptimizer()
        
        if req.use_real_time_data:
            # Use real-time data from Go API clients
            result = optimizer.optimize_route_with_real_time_data(
                req.start_code, 
                req.dest_code,
                req.crew_region
            )
        else:
            # Fallback to original optimization
            routes = optimizer.optimizer.compare_routes(
                req.start_code.upper(), 
                req.dest_code.upper()
            )
            result = {
                "routes": routes,
                "constraints_applied": {"no_fly_zones": [], "weather_restrictions": []},
                "real_time_data_timestamp": datetime.now().isoformat(),
                "go_api_status": "not_used"
            }
        
        return result
    
    except Exception as e:
        logger.error(f"Error in predict_route_enhanced: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_flights")
async def analyze_flights(req: FlightAnalysisRequest):
    """Comprehensive flight analysis for multiple routes"""
    try:
        optimizer = EnhancedFlightOptimizer()
        results = {}
        
        for route in req.routes:
            if "-" not in route:
                results[route] = {"error": "Invalid route format. Use 'ORIGIN-DESTINATION'"}
                continue
                
            origin, destination = route.split("-", 1)
            
            try:
                analysis = optimizer.optimize_route_with_real_time_data(origin, destination)
                
                if req.analysis_type == "comprehensive":
                    # Add additional analysis
                    constraints = optimizer.get_real_time_constraints(route)
                    analysis["detailed_constraints"] = constraints
                    analysis["risk_assessment"] = {
                        "overall_risk": optimizer._assess_route_geopolitical_risk(
                            analysis["routes"].get("cheapest", {}), constraints
                        ),
                        "weather_risk": len(constraints.get("weather_restrictions", [])),
                        "geopolitical_risk": max(constraints.get("geopolitical_risks", {}).values(), default=0)
                    }
                
                results[route] = analysis
                
            except Exception as e:
                results[route] = {"error": str(e)}
        
        return {
            "analysis_results": results,
            "analysis_type": req.analysis_type,
            "timestamp": datetime.now().isoformat(),
            "total_routes_analyzed": len(req.routes)
        }
    
    except Exception as e:
        logger.error(f"Error in analyze_flights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api_status")
async def api_status():
    """Get comprehensive API status"""
    go_client = GoAPIClient()
    go_api_healthy = go_client.health_check()
    
    # Test environment data fetch
    try:
        env_data = go_client.get_flight_environment_data()
        data_fetch_success = True
        data_timestamp = env_data.get("timestamp", "unknown")
    except Exception as e:
        data_fetch_success = False
        data_timestamp = str(e)
    
    return {
        "marl_system": "operational",
        "go_api_bridge": "healthy" if go_api_healthy else "unavailable",
        "data_fetch": "success" if data_fetch_success else "failed",
        "last_data_timestamp": data_timestamp,
        "available_endpoints": [
            "/health",
            "/predict_route",
            "/predict_route_enhanced", 
            "/analyze_flights",
            "/api_status"
        ],
        "system_timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "FlightNet MARL API",
        "version": "1.0.0",
        "description": "Multi-Agent Reinforcement Learning API for Flight Route Optimization",
        "endpoints": {
            "health": "GET /health - Health check",
            "predict_route": "POST /predict_route - Basic route prediction",
            "predict_route_enhanced": "POST /predict_route_enhanced - Enhanced route prediction with real-time data",
            "analyze_flights": "POST /analyze_flights - Comprehensive flight analysis",
            "api_status": "GET /api_status - Comprehensive API status"
        },
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
