import math
import heapq
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import csv
import os

def save_expert_trajectory(trajectories, filepath="flightnet/data/expert_routes.csv"):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["agent_id", "lat", "lon", "alt", "dlat", "dlon", "dalt", "dx", "dy", "dz"])

        for agent_id, steps in trajectories.items():
            for step in steps:
                pos = step["pos"]          # [lat, lon, alt]
                dest = step["dest"]        # [dlat, dlon, dalt]
                action = step["action"]    # [dx, dy, dz]
                row = [agent_id] + pos + dest + action
                writer.writerow(row)

class OptimizationMode(Enum):
    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    BALANCED = "balanced"

@dataclass
class Airport:
    id: str
    name: str
    lat: float
    lon: float
    fuel_price_per_kg: float  # USD per kg of fuel
    landing_fee: float        # USD flat fee for landing
    country: str
    max_fuel_capacity: float  # Maximum fuel that can be loaded (kg)

@dataclass
class CrewCosts:
    pilot_cost_per_hour: float      # Captain + First Officer cost per hour
    cabin_crew_cost_per_hour: float # Flight attendants cost per hour
    ground_crew_cost_per_hour: float # Ground handling crew cost per hour
    
    @property
    def total_crew_cost_per_hour(self) -> float:
        return self.pilot_cost_per_hour + self.cabin_crew_cost_per_hour + self.ground_crew_cost_per_hour

@dataclass
class AircraftCosts:
    # Direct operating costs
    fuel_consumption_per_km: float    # kg of fuel per km
    maintenance_cost_per_hour: float  # Maintenance cost per flight hour
    depreciation_cost_per_hour: float # Aircraft depreciation per hour
    insurance_cost_per_hour: float    # Insurance cost per hour
    
    # Airport/route specific
    navigation_fees_per_km: float     # En-route navigation fees
    ground_handling_base_cost: float  # Base ground handling cost per stop

@dataclass
class Aircraft:
    max_range_km: float       # Maximum range without refueling
    max_fuel_capacity: float  # Maximum fuel tank capacity (kg)
    cruise_speed_kmh: float   # Cruise speed in km/h
    category: str            # Aircraft category
    costs: AircraftCosts     # Detailed cost structure

@dataclass
class FlightSegment:
    from_airport: str
    to_airport: str
    distance_km: float
    flight_time_hours: float
    fuel_needed_kg: float
    fuel_cost: float          # Cost of fuel purchased at departure airport
    landing_fee: float
    crew_cost: float          # Fixed crew cost from origin
    maintenance_cost: float
    depreciation_cost: float
    insurance_cost: float
    navigation_fees: float
    ground_handling_cost: float
    requires_refuel: bool     # Whether we need to refuel at departure airport
    total_cost: float

@dataclass
class FlightRoute:
    path: List[str]
    segments: List[FlightSegment]
    total_distance: float
    total_flight_time: float
    total_fuel_cost: float
    total_landing_fees: float
    total_crew_cost: float
    total_maintenance_cost: float
    total_depreciation_cost: float
    total_insurance_cost: float
    total_navigation_fees: float
    total_ground_handling_cost: float
    total_cost: float
    number_of_stops: int
    optimization_mode: str
    origin_crew_costs: CrewCosts  # Fixed crew costs from origin

class InternationalFlightOptimizer:
    def __init__(self, aircraft: Aircraft, origin_crew_costs: CrewCosts):
        self.airports: Dict[str, Airport] = {}
        self.aircraft = aircraft
        self.origin_crew_costs = origin_crew_costs  # Fixed for entire journey
        # Safety margin - use 90% of max range to ensure safe landing
        self.safety_factor = 0.9
        self.max_safe_range = aircraft.max_range_km * self.safety_factor
    
    def add_airport(self, airport_id: str, name: str, lat: float, lon: float, 
                   fuel_price: float, landing_fee: float, country: str, 
                   max_fuel_capacity: float = None):
        """Add an airport to the network"""
        if max_fuel_capacity is None:
            max_fuel_capacity = self.aircraft.max_fuel_capacity
        
        airport = Airport(airport_id, name, lat, lon, fuel_price, landing_fee, 
                         country, max_fuel_capacity)
        self.airports[airport_id] = airport
    
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great circle distance between two points"""
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return 6371 * c  # Earth radius in km
    
    def get_distance_between_airports(self, airport1_id: str, airport2_id: str) -> float:
        """Get distance between two airports"""
        if airport1_id not in self.airports or airport2_id not in self.airports:
            return float('inf')
        
        airport1 = self.airports[airport1_id]
        airport2 = self.airports[airport2_id]
        
        return self.haversine_distance(airport1.lat, airport1.lon, airport2.lat, airport2.lon)
    
    def can_fly_direct(self, from_id: str, to_id: str) -> bool:
        """Check if aircraft can fly directly between two airports"""
        distance = self.get_distance_between_airports(from_id, to_id)
        return distance <= self.max_safe_range
    
    def calculate_fuel_needed_for_journey(self, path: List[str]) -> Dict[str, float]:
        """
        Calculate fuel requirements for entire journey.
        Returns dict mapping airport_id -> fuel_to_purchase_kg
        """
        if len(path) < 2:
            return {}
        
        fuel_purchases = {}
        current_fuel = 0  # Start with empty tank
        
        for i in range(len(path) - 1):
            from_airport = path[i]
            to_airport = path[i + 1]
            
            # Calculate fuel needed for this segment
            distance = self.get_distance_between_airports(from_airport, to_airport)
            fuel_needed = distance * self.aircraft.costs.fuel_consumption_per_km
            
            # Check if we have enough fuel
            if current_fuel < fuel_needed:
                # Need to refuel at current airport
                fuel_to_buy = min(
                    fuel_needed - current_fuel,  # Minimum needed
                    self.aircraft.max_fuel_capacity - current_fuel  # Tank capacity limit
                )
                fuel_purchases[from_airport] = fuel_to_buy
                current_fuel += fuel_to_buy
            
            # Consume fuel for this segment
            current_fuel -= fuel_needed
        
        return fuel_purchases
    
    def calculate_segment_cost(self, from_id: str, to_id: str, fuel_purchases: Dict[str, float]) -> FlightSegment:
        """Calculate detailed cost for a single flight segment with correct fuel logic"""
        distance = self.get_distance_between_airports(from_id, to_id)
        
        # Calculate flight time (including taxi, takeoff, landing time)
        flight_time_hours = distance / self.aircraft.cruise_speed_kmh
        ground_operations_hours = 0.5  # 30 minutes for taxi, takeoff, approach, landing
        block_time_hours = flight_time_hours + ground_operations_hours
        
        # Calculate fuel needed (only for airborne portion)
        fuel_needed = distance * self.aircraft.costs.fuel_consumption_per_km
        
        # Fuel cost: only if we're purchasing fuel at this departure airport
        fuel_cost = 0
        requires_refuel = False
        if from_id in fuel_purchases:
            from_airport = self.airports[from_id]
            fuel_cost = fuel_purchases[from_id] * from_airport.fuel_price_per_kg
            requires_refuel = True
        
        # Landing fee at destination
        to_airport = self.airports[to_id]
        landing_fee = to_airport.landing_fee
        
        # Calculate operating costs using FIXED crew costs from origin
        crew_cost = block_time_hours * self.origin_crew_costs.total_crew_cost_per_hour
        maintenance_cost = block_time_hours * self.aircraft.costs.maintenance_cost_per_hour
        depreciation_cost = block_time_hours * self.aircraft.costs.depreciation_cost_per_hour
        insurance_cost = block_time_hours * self.aircraft.costs.insurance_cost_per_hour
        navigation_fees = distance * self.aircraft.costs.navigation_fees_per_km
        ground_handling_cost = self.aircraft.costs.ground_handling_base_cost
        
        total_cost = (fuel_cost + landing_fee + crew_cost + maintenance_cost + 
                     depreciation_cost + insurance_cost + navigation_fees + ground_handling_cost)
        
        return FlightSegment(
            from_airport=from_id,
            to_airport=to_id,
            distance_km=distance,
            flight_time_hours=block_time_hours,
            fuel_needed_kg=fuel_needed,
            fuel_cost=fuel_cost,
            landing_fee=landing_fee,
            crew_cost=crew_cost,
            maintenance_cost=maintenance_cost,
            depreciation_cost=depreciation_cost,
            insurance_cost=insurance_cost,
            navigation_fees=navigation_fees,
            ground_handling_cost=ground_handling_cost,
            requires_refuel=requires_refuel,
            total_cost=total_cost
        )
    
    def calculate_path_cost(self, path: List[str], mode: OptimizationMode) -> Tuple[float, List[FlightSegment]]:
        """Calculate total cost/metric for a complete path"""
        if len(path) < 2:
            return float('inf'), []
        
        # First, determine fuel requirements for entire journey
        fuel_purchases = self.calculate_fuel_needed_for_journey(path)
        
        # Calculate each segment
        segments = []
        total_cost = 0
        total_time = 0
        
        for i in range(len(path) - 1):
            segment = self.calculate_segment_cost(path[i], path[i + 1], fuel_purchases)
            segments.append(segment)
            total_cost += segment.total_cost
            total_time += segment.flight_time_hours
        
        # Return appropriate metric based on optimization mode
        if mode == OptimizationMode.CHEAPEST:
            return total_cost, segments
        elif mode == OptimizationMode.FASTEST:
            return total_time, segments
        else:  # BALANCED
            # Normalize and combine cost and time
            normalized_cost = total_cost / 10000
            normalized_time = total_time
            combined_metric = 0.7 * normalized_cost + 0.3 * normalized_time
            return combined_metric, segments
    
    def dijkstra_optimized(self, start_id: str, end_id: str, mode: OptimizationMode) -> Tuple[List[str], float]:
        """
        Find optimal route using Dijkstra's algorithm.
        NOW CHECKS ALL AIRPORTS as potential intermediate stops!
        """
        if start_id not in self.airports or end_id not in self.airports:
            return [], float('inf')
        
        # Track: {airport_id: (metric_value, previous_airport, full_path_to_here)}
        best_metrics = {airport_id: float('inf') for airport_id in self.airports}
        best_previous = {airport_id: None for airport_id in self.airports}
        best_paths = {airport_id: [] for airport_id in self.airports}
        
        best_metrics[start_id] = 0
        best_paths[start_id] = [start_id]
        
        # Priority queue: (metric_value, airport_id)
        pq = [(0, start_id)]
        visited = set()
        
        while pq:
            current_metric, current_id = heapq.heappop(pq)
            
            if current_id in visited:
                continue
            
            visited.add(current_id)
            
            if current_id == end_id:
                break
            
            # Check ALL airports as potential next destinations
            # This is the key change - we explore every possible airport!
            for neighbor_id in self.airports:
                if neighbor_id == current_id or neighbor_id in visited:
                    continue
                
                # Check if we can fly directly to this airport
                if self.can_fly_direct(current_id, neighbor_id):
                    # Create path to this neighbor
                    new_path = best_paths[current_id] + [neighbor_id]
                    
                    # Calculate cost/metric for this complete path
                    path_metric, _ = self.calculate_path_cost(new_path, mode)
                    
                    if path_metric < best_metrics[neighbor_id]:
                        best_metrics[neighbor_id] = path_metric
                        best_previous[neighbor_id] = current_id
                        best_paths[neighbor_id] = new_path
                        heapq.heappush(pq, (path_metric, neighbor_id))
        
        # Return the best path found
        if end_id in best_paths and best_paths[end_id]:
            return best_paths[end_id], best_metrics[end_id]
        else:
            return [], float('inf')
    
    def optimize_route(self, start_id: str, end_id: str, mode: OptimizationMode = OptimizationMode.CHEAPEST) -> FlightRoute:
        """Find the optimal route between two airports based on specified criteria"""
        path, _ = self.dijkstra_optimized(start_id, end_id, mode)
        
        if not path:
            return FlightRoute([], [], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, float('inf'), 0, mode.value, self.origin_crew_costs)
        
        # Calculate final route with correct fuel logic
        fuel_purchases = self.calculate_fuel_needed_for_journey(path)
        segments = []
        
        for i in range(len(path) - 1):
            segment = self.calculate_segment_cost(path[i], path[i + 1], fuel_purchases)
            segments.append(segment)
        
        # Aggregate totals
        total_distance = sum(seg.distance_km for seg in segments)
        total_flight_time = sum(seg.flight_time_hours for seg in segments)
        total_fuel_cost = sum(seg.fuel_cost for seg in segments)
        total_landing_fees = sum(seg.landing_fee for seg in segments)
        total_crew_cost = sum(seg.crew_cost for seg in segments)
        total_maintenance_cost = sum(seg.maintenance_cost for seg in segments)
        total_depreciation_cost = sum(seg.depreciation_cost for seg in segments)
        total_insurance_cost = sum(seg.insurance_cost for seg in segments)
        total_navigation_fees = sum(seg.navigation_fees for seg in segments)
        total_ground_handling_cost = sum(seg.ground_handling_cost for seg in segments)
        
        total_cost = (total_fuel_cost + total_landing_fees + total_crew_cost + 
                     total_maintenance_cost + total_depreciation_cost + total_insurance_cost +
                     total_navigation_fees + total_ground_handling_cost)
        
        return FlightRoute(
            path=path,
            segments=segments,
            total_distance=total_distance,
            total_flight_time=total_flight_time,
            total_fuel_cost=total_fuel_cost,
            total_landing_fees=total_landing_fees,
            total_crew_cost=total_crew_cost,
            total_maintenance_cost=total_maintenance_cost,
            total_depreciation_cost=total_depreciation_cost,
            total_insurance_cost=total_insurance_cost,
            total_navigation_fees=total_navigation_fees,
            total_ground_handling_cost=total_ground_handling_cost,
            total_cost=total_cost,
            number_of_stops=len(path) - 2,
            optimization_mode=mode.value,
            origin_crew_costs=self.origin_crew_costs
        )
    
    def compare_routes(self, start_id: str, end_id: str) -> Dict:
        """Compare cheapest vs fastest routes"""
        cheapest_route = self.optimize_route(start_id, end_id, OptimizationMode.CHEAPEST)
        fastest_route = self.optimize_route(start_id, end_id, OptimizationMode.FASTEST)
        
        return {
            "cheapest": self.get_route_summary(cheapest_route),
            "fastest": self.get_route_summary(fastest_route)
        }
    
    def get_route_summary(self, route: FlightRoute) -> Dict:
        """Get detailed summary of a flight route"""
        if not route.path:
            return {"error": "No valid route found"}
        
        summary = {
            "route_overview": {
                "optimization_mode": route.optimization_mode,
                "origin": {
                    "code": route.path[0],
                    "name": self.airports[route.path[0]].name,
                    "country": self.airports[route.path[0]].country
                },
                "destination": {
                    "code": route.path[-1],
                    "name": self.airports[route.path[-1]].name,
                    "country": self.airports[route.path[-1]].country
                },
                "route_path": " → ".join(route.path),
                "total_distance_km": round(route.total_distance, 2),
                "total_flight_time_hours": round(route.total_flight_time, 2),
                "number_of_stops": route.number_of_stops,
                "total_cost_usd": round(route.total_cost, 2),
                "aircraft_category": self.aircraft.category,
                "crew_cost_structure": f"${route.origin_crew_costs.total_crew_cost_per_hour:.0f}/hour (Origin-based)"
            },
            "detailed_cost_breakdown": {
                "fuel_cost_usd": round(route.total_fuel_cost, 2),
                "landing_fees_usd": round(route.total_landing_fees, 2),
                "crew_cost_usd": round(route.total_crew_cost, 2),
                "maintenance_cost_usd": round(route.total_maintenance_cost, 2),
                "depreciation_cost_usd": round(route.total_depreciation_cost, 2),
                "insurance_cost_usd": round(route.total_insurance_cost, 2),
                "navigation_fees_usd": round(route.total_navigation_fees, 2),
                "ground_handling_cost_usd": round(route.total_ground_handling_cost, 2),
                "cost_per_km_usd": round(route.total_cost / route.total_distance, 2) if route.total_distance > 0 else 0,
                "cost_per_hour_usd": round(route.total_cost / route.total_flight_time, 2) if route.total_flight_time > 0 else 0
            },
            "flight_segments": []
        }
        
        for i, segment in enumerate(route.segments, 1):
            from_airport = self.airports[segment.from_airport]
            to_airport = self.airports[segment.to_airport]
            
            segment_info = {
                "segment_number": i,
                "from": {
                    "code": from_airport.id,
                    "name": from_airport.name,
                    "country": from_airport.country
                },
                "to": {
                    "code": to_airport.id,
                    "name": to_airport.name,
                    "country": to_airport.country
                },
                "distance_km": round(segment.distance_km, 2),
                "flight_time_hours": round(segment.flight_time_hours, 2),
                "fuel_needed_kg": round(segment.fuel_needed_kg, 2),
                "refuel_info": {
                    "requires_refuel": segment.requires_refuel,
                    "fuel_price_per_kg": from_airport.fuel_price_per_kg if segment.requires_refuel else "N/A"
                },
                "detailed_costs": {
                    "fuel_cost_usd": round(segment.fuel_cost, 2),
                    "landing_fee_usd": round(segment.landing_fee, 2),
                    "crew_cost_usd": round(segment.crew_cost, 2),
                    "maintenance_cost_usd": round(segment.maintenance_cost, 2),
                    "depreciation_cost_usd": round(segment.depreciation_cost, 2),
                    "insurance_cost_usd": round(segment.insurance_cost, 2),
                    "navigation_fees_usd": round(segment.navigation_fees, 2),
                    "ground_handling_cost_usd": round(segment.ground_handling_cost, 2),
                    "total_segment_cost_usd": round(segment.total_cost, 2)
                }
            }
            summary["flight_segments"].append(segment_info)
        
        return summary


def create_crew_costs_by_region(region: str) -> CrewCosts:
    """Create crew costs based on regional wage standards"""
    if region.lower() == "india":
        return CrewCosts(
            pilot_cost_per_hour=120,      # Captain + First Officer
            cabin_crew_cost_per_hour=45,  # Flight attendants
            ground_crew_cost_per_hour=25  # Ground handling crew
        )
    elif region.lower() == "us":
        return CrewCosts(
            pilot_cost_per_hour=380,      # Captain + First Officer
            cabin_crew_cost_per_hour=95,  # Flight attendants
            ground_crew_cost_per_hour=75  # Ground handling crew
        )
    elif region.lower() == "europe":
        return CrewCosts(
            pilot_cost_per_hour=320,      # Captain + First Officer
            cabin_crew_cost_per_hour=85,  # Flight attendants
            ground_crew_cost_per_hour=65  # Ground handling crew
        )
    elif region.lower() == "middle_east":
        return CrewCosts(
            pilot_cost_per_hour=250,      # Captain + First Officer
            cabin_crew_cost_per_hour=70,  # Flight attendants
            ground_crew_cost_per_hour=45  # Ground handling crew
        )
    else:
        # Default to moderate costs
        return CrewCosts(
            pilot_cost_per_hour=200,
            cabin_crew_cost_per_hour=60,
            ground_crew_cost_per_hour=40
        )


def create_aircraft():
    """Create aircraft specification (Boeing 777-300ER equivalent)"""
    aircraft_costs = AircraftCosts(
        fuel_consumption_per_km=3.2,      # kg fuel per km
        maintenance_cost_per_hour=850,     # Maintenance cost
        depreciation_cost_per_hour=1200,   # Aircraft depreciation
        insurance_cost_per_hour=180,       # Insurance costs
        navigation_fees_per_km=0.12,       # En-route navigation fees
        ground_handling_base_cost=450      # Ground handling per stop
    )
    
    return Aircraft(
        max_range_km=13000,                # Boeing 777-300ER range
        max_fuel_capacity=45000,           # Fuel capacity in kg
        cruise_speed_kmh=900,              # Cruise speed
        category="Widebody Long Range",
        costs=aircraft_costs
    )


def example_usage():
    """Example demonstrating the enhanced optimizer with proper fuel logic and full route exploration"""

    print("=== Enhanced Flight Route Optimizer ===")
    print("Features:")
    print("- Fixed crew costs based on origin country")
    print("- Correct fuel purchasing logic (only pay where you refuel)")
    print("- Explores ALL possible intermediate airports")
    print("- Compares cheapest vs fastest routes\n")

    # Add comprehensive airport network with realistic fuel prices
    airports = [
        # India
        ("DEL", "Indira Gandhi Intl Delhi", 28.5562, 77.1000, 0.82, 1800, "India"),
        ("BOM", "Mumbai Chhatrapati Shivaji", 19.0896, 72.8656, 0.84, 1900, "India"),
        ("BLR", "Bangalore Kempegowda", 13.1986, 77.7066, 0.83, 1600, "India"),
        # Middle East
        ("DXB", "Dubai International", 25.2532, 55.3657, 0.78, 1800, "UAE"),
        ("DOH", "Doha Hamad", 25.2731, 51.6081, 0.76, 1600, "Qatar"),
        ("AUH", "Abu Dhabi", 24.4330, 54.6511, 0.77, 1700, "UAE"),
        # Asia
        ("SIN", "Singapore Changi", 1.3644, 103.9915, 0.88, 2200, "Singapore"),
        ("KUL", "Kuala Lumpur", 2.7456, 101.7072, 0.79, 1500, "Malaysia"),
        ("BKK", "Bangkok Suvarnabhumi", 13.6900, 100.7501, 0.81, 1700, "Thailand"),
        ("ICN", "Seoul Incheon", 37.4602, 126.4407, 0.89, 2400, "South Korea"),
        # Europe
        ("LHR", "London Heathrow", 51.4700, -0.4543, 0.92, 3200, "UK"),
        ("CDG", "Paris Charles de Gaulle", 49.0097, 2.5479, 0.90, 2900, "France"),
        ("FRA", "Frankfurt am Main", 50.0379, 8.5622, 0.89, 2900, "Germany"),
        ("AMS", "Amsterdam Schiphol", 52.3105, 4.7683, 0.91, 2800, "Netherlands"),
        # North America
        ("JFK", "New York JFK", 40.6413, -73.7781, 0.85, 2500, "USA"),
        ("LAX", "Los Angeles", 33.9425, -118.4081, 0.83, 2300, "USA"),
        ("YYZ", "Toronto Pearson", 43.6777, -79.6248, 0.86, 2200, "Canada"),
        # Others
        ("NRT", "Tokyo Narita", 35.7720, 140.3929, 0.95, 2800, "Japan"),
        ("SYD", "Sydney Kingsford Smith", -33.9461, 151.1772, 0.90, 2400, "Australia"),
    ]

    # List of regions to generate expert trajectories for
    regions = ["india", "uk", "us"]

    all_expert_trajectories = []

    for region in regions:
        print(f"\n=== ROUTE ANALYSIS ({region.upper()} crew costs) ===")
        aircraft = create_aircraft()
        crew_costs = create_crew_costs_by_region(region)
        optimizer = InternationalFlightOptimizer(aircraft, crew_costs)

        for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
            optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)

        routes = optimizer.compare_routes("DEL", "JFK")

        # Use the cheapest route for expert trajectory
        if "error" not in routes["cheapest"]:
            route = routes["cheapest"]
            for seg in route["flight_segments"]:
                from_airport = optimizer.airports[seg["from"]["code"]]
                to_airport = optimizer.airports[seg["to"]["code"]]
                pos = [from_airport.lat, from_airport.lon, 10000]
                dest = [to_airport.lat, to_airport.lon, 10000]
                dx = to_airport.lat - from_airport.lat
                dy = to_airport.lon - from_airport.lon
                dz = 0
                all_expert_trajectories.append({
                    "agent_id": region,  # Use region as agent_id for clarity
                    "pos": pos,
                    "dest": dest,
                    "action": [dx, dy, dz]
                })

    # Save all expert trajectories to one CSV
    out_csv = "flightnet/data/expert_routes.csv"
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    with open(out_csv, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["agent_id", "lat", "lon", "alt", "dlat", "dlon", "dalt", "dx", "dy", "dz"])
        for step in all_expert_trajectories:
            row = [step["agent_id"]] + step["pos"] + step["dest"] + step["action"]
            writer.writerow(row)
    print(f"✅ All expert trajectories exported to {out_csv}")

if __name__ == "__main__":
    example_usage()
