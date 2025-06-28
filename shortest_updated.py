import math
import heapq
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

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
class Aircraft:
    max_range_km: float       # Maximum range without refueling
    fuel_consumption_per_km: float  # kg of fuel per km
    max_fuel_capacity: float  # Maximum fuel tank capacity (kg)
    base_operating_cost_per_km: float  # Base cost per km (crew, maintenance, etc.)

@dataclass
class FlightSegment:
    from_airport: str
    to_airport: str
    distance_km: float
    fuel_needed_kg: float
    fuel_cost: float
    landing_fee: float
    total_cost: float

@dataclass
class FlightRoute:
    path: List[str]
    segments: List[FlightSegment]
    total_distance: float
    total_fuel_cost: float
    total_landing_fees: float
    total_operating_cost: float
    total_cost: float
    number_of_stops: int

class InternationalFlightOptimizer:
    def __init__(self, aircraft: Aircraft):
        self.airports: Dict[str, Airport] = {}
        self.connections: Dict[str, List[str]] = {}
        self.aircraft = aircraft
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
        
        if airport_id not in self.connections:
            self.connections[airport_id] = []
    
    def add_connection(self, from_id: str, to_id: str, bidirectional: bool = True):
        """Add flight connection between airports"""
        if from_id in self.connections:
            if to_id not in self.connections[from_id]:
                self.connections[from_id].append(to_id)
        
        if bidirectional and to_id in self.connections:
            if from_id not in self.connections[to_id]:
                self.connections[to_id].append(from_id)
    
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
    
    def calculate_segment_cost(self, from_id: str, to_id: str) -> FlightSegment:
        """Calculate cost for a single flight segment"""
        distance = self.get_distance_between_airports(from_id, to_id)
        
        # Calculate fuel needed
        fuel_needed = distance * self.aircraft.fuel_consumption_per_km
        
        # Get airport costs
        to_airport = self.airports[to_id]
        fuel_cost = fuel_needed * to_airport.fuel_price_per_kg
        landing_fee = to_airport.landing_fee
        
        # Base operating cost
        operating_cost = distance * self.aircraft.base_operating_cost_per_km
        
        total_cost = fuel_cost + landing_fee + operating_cost
        
        return FlightSegment(
            from_airport=from_id,
            to_airport=to_id,
            distance_km=distance,
            fuel_needed_kg=fuel_needed,
            fuel_cost=fuel_cost,
            landing_fee=landing_fee,
            total_cost=total_cost
        )
    
    def find_intermediate_stops(self, from_id: str, to_id: str) -> List[str]:
        """Find potential intermediate stops for long-range flights"""
        if self.can_fly_direct(from_id, to_id):
            return []
        
        from_airport = self.airports[from_id]
        to_airport = self.airports[to_id]
        
        # Find airports within range that could serve as intermediate stops
        intermediate_candidates = []
        
        for airport_id, airport in self.airports.items():
            if airport_id == from_id or airport_id == to_id:
                continue
            
            # Check if we can reach this airport from origin
            dist_from_origin = self.get_distance_between_airports(from_id, airport_id)
            # Check if we can reach destination from this airport
            dist_to_destination = self.get_distance_between_airports(airport_id, to_id)
            
            if (dist_from_origin <= self.max_safe_range and 
                dist_to_destination <= self.max_safe_range):
                
                # Calculate if this intermediate stop makes geographic sense
                direct_distance = self.get_distance_between_airports(from_id, to_id)
                via_distance = dist_from_origin + dist_to_destination
                
                # Only consider if detour is reasonable (less than 150% of direct distance)
                if via_distance <= direct_distance * 1.5:
                    intermediate_candidates.append(airport_id)
        
        return intermediate_candidates
    
    def dijkstra_cost_optimized(self, start_id: str, end_id: str) -> Tuple[List[str], float]:
        """Find most cost-effective route using Dijkstra's algorithm"""
        if start_id not in self.airports or end_id not in self.airports:
            return [], float('inf')
        
        # Track: {airport_id: (total_cost, previous_airport)}
        costs = {airport_id: float('inf') for airport_id in self.airports}
        previous = {airport_id: None for airport_id in self.airports}
        costs[start_id] = 0
        
        # Priority queue: (total_cost, airport_id)
        pq = [(0, start_id)]
        visited = set()
        
        while pq:
            current_cost, current_id = heapq.heappop(pq)
            
            if current_id in visited:
                continue
            
            visited.add(current_id)
            
            if current_id == end_id:
                break
            
            # Check direct connections
            if current_id in self.connections:
                for neighbor_id in self.connections[current_id]:
                    if neighbor_id in visited:
                        continue
                    
                    # Check if we can fly directly
                    if self.can_fly_direct(current_id, neighbor_id):
                        segment = self.calculate_segment_cost(current_id, neighbor_id)
                        new_cost = costs[current_id] + segment.total_cost
                        
                        if new_cost < costs[neighbor_id]:
                            costs[neighbor_id] = new_cost
                            previous[neighbor_id] = current_id
                            heapq.heappush(pq, (new_cost, neighbor_id))
            
            # Also check all airports for potential intermediate stops
            # This allows finding multi-hop routes when direct flights aren't possible
            for neighbor_id in self.airports:
                if neighbor_id == current_id or neighbor_id in visited:
                    continue
                
                if self.can_fly_direct(current_id, neighbor_id):
                    segment = self.calculate_segment_cost(current_id, neighbor_id)
                    new_cost = costs[current_id] + segment.total_cost
                    
                    if new_cost < costs[neighbor_id]:
                        costs[neighbor_id] = new_cost
                        previous[neighbor_id] = current_id
                        heapq.heappush(pq, (new_cost, neighbor_id))
        
        # Reconstruct path
        path = []
        current = end_id
        while current is not None:
            path.append(current)
            current = previous[current]
        
        if len(path) == 1 and path[0] != start_id:
            return [], float('inf')
        
        path.reverse()
        return path, costs[end_id]
    
    def optimize_route(self, start_id: str, end_id: str) -> FlightRoute:
        """Find the most cost-effective route between two airports"""
        path, total_cost = self.dijkstra_cost_optimized(start_id, end_id)
        
        if not path:
            return FlightRoute([], [], 0, 0, 0, 0, float('inf'), 0)
        
        # Calculate detailed route information
        segments = []
        total_distance = 0
        total_fuel_cost = 0
        total_landing_fees = 0
        total_operating_cost = 0
        
        for i in range(len(path) - 1):
            segment = self.calculate_segment_cost(path[i], path[i + 1])
            segments.append(segment)
            
            total_distance += segment.distance_km
            total_fuel_cost += segment.fuel_cost
            total_landing_fees += segment.landing_fee
            total_operating_cost += segment.distance_km * self.aircraft.base_operating_cost_per_km
        
        return FlightRoute(
            path=path,
            segments=segments,
            total_distance=total_distance,
            total_fuel_cost=total_fuel_cost,
            total_landing_fees=total_landing_fees,
            total_operating_cost=total_operating_cost,
            total_cost=total_fuel_cost + total_landing_fees + total_operating_cost,
            number_of_stops=len(path) - 2
        )
    
    def get_route_summary(self, route: FlightRoute) -> Dict:
        """Get detailed summary of a flight route"""
        if not route.path:
            return {"error": "No valid route found"}
        
        summary = {
            "route_overview": {
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
                "total_distance_km": round(route.total_distance, 2),
                "number_of_stops": route.number_of_stops,
                "total_cost_usd": round(route.total_cost, 2)
            },
            "cost_breakdown": {
                "fuel_cost_usd": round(route.total_fuel_cost, 2),
                "landing_fees_usd": round(route.total_landing_fees, 2),
                "operating_cost_usd": round(route.total_operating_cost, 2),
                "cost_per_km": round(route.total_cost / route.total_distance, 2) if route.total_distance > 0 else 0
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
                "fuel_needed_kg": round(segment.fuel_needed_kg, 2),
                "costs": {
                    "fuel_cost_usd": round(segment.fuel_cost, 2),
                    "landing_fee_usd": round(segment.landing_fee, 2),
                    "total_segment_cost_usd": round(segment.total_cost, 2)
                }
            }
            summary["flight_segments"].append(segment_info)
        
        return summary
    
    def load_airports_from_file(self, filename: str):
        """Load airport data from JSON file"""
        try:
            with open(filename, 'r') as f:
                airport_data = json.load(f)
            
            for airport in airport_data:
                self.add_airport(
                    airport['id'],
                    airport['name'],
                    airport['lat'],
                    airport['lon'],
                    airport['fuel_price'],
                    airport['landing_fee'],
                    airport['country'],
                    airport.get('max_fuel_capacity')
                )
            print(f"Loaded {len(airport_data)} airports from {filename}")
        except FileNotFoundError:
            print(f"File {filename} not found")
        except json.JSONDecodeError:
            print(f"Invalid JSON in {filename}")
    
    def save_airports_template(self, filename: str):
        """Save a template JSON file for airport data"""
        template = [
            {
                "id": "JFK",
                "name": "John F. Kennedy International",
                "lat": 40.6413,
                "lon": -73.7781,
                "fuel_price": 0.85,
                "landing_fee": 2500,
                "country": "USA",
                "max_fuel_capacity": 50000
            },
            {
                "id": "LHR",
                "name": "London Heathrow",
                "lat": 51.4700,
                "lon": -0.4543,
                "fuel_price": 0.92,
                "landing_fee": 3200,
                "country": "UK",
                "max_fuel_capacity": 45000
            }
        ]
        
        with open(filename, 'w') as f:
            json.dump(template, f, indent=2)
        print(f"Template saved to {filename}")

# Example usage
def example_usage():
    """Example of how to use the optimizer"""
    
    # Define aircraft specifications (example: Boeing 777-300ER)
    aircraft = Aircraft(
        max_range_km=13000,           # ~13,000 km range
        fuel_consumption_per_km=3.2,   # ~3.2 kg fuel per km
        max_fuel_capacity=45000,       # ~45,000 kg fuel capacity
        base_operating_cost_per_km=2.5 # $2.5 per km base cost
    )
    
    # Create optimizer
    optimizer = InternationalFlightOptimizer(aircraft)
    
    # Add sample international airports
    airports = [
        ("JFK", "John F Kennedy Intl", 40.6413, -73.7781, 0.85, 2500, "USA"),
        ("LHR", "London Heathrow", 51.4700, -0.4543, 0.92, 3200, "UK"),
        ("DXB", "Dubai International", 25.2532, 55.3657, 0.78, 1800, "UAE"),
        ("SIN", "Singapore Changi", 1.3644, 103.9915, 0.88, 2200, "Singapore"),
        ("NRT", "Tokyo Narita", 35.7720, 140.3929, 0.95, 2800, "Japan"),
        ("SYD", "Sydney Kingsford Smith", -33.9461, 151.1772, 0.90, 2400, "Australia"),
        ("FRA", "Frankfurt am Main", 50.0379, 8.5622, 0.89, 2900, "Germany"),
        ("LAX", "Los Angeles Intl", 33.9425, -118.4081, 0.83, 2300, "USA")
    ]
    
    for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
        optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)
    
    # Add connections (simplified global network)
    connections = [
        ("JFK", "LHR"), ("JFK", "FRA"), ("JFK", "LAX"),
        ("LHR", "DXB"), ("LHR", "FRA"), ("LHR", "SIN"),
        ("DXB", "SIN"), ("DXB", "NRT"), ("DXB", "SYD"),
        ("SIN", "NRT"), ("SIN", "SYD"),
        ("NRT", "LAX"), ("LAX", "SYD"),
        ("FRA", "DXB"), ("FRA", "SIN")
    ]
    
    for from_id, to_id in connections:
        optimizer.add_connection(from_id, to_id)
    
    # Find optimal route
    print("=== International Flight Route Optimization ===\n")
    
    route = optimizer.optimize_route("JFK", "SYD")
    summary = optimizer.get_route_summary(route)
    
    if "error" not in summary:
        print(f"Optimal route from {summary['route_overview']['origin']['name']} to {summary['route_overview']['destination']['name']}:")
        print(f"Total distance: {summary['route_overview']['total_distance_km']} km")
        print(f"Number of stops: {summary['route_overview']['number_of_stops']}")
        print(f"Total cost: ${summary['route_overview']['total_cost_usd']:,.2f}")
        print(f"\nCost breakdown:")
        print(f"- Fuel: ${summary['cost_breakdown']['fuel_cost_usd']:,.2f}")
        print(f"- Landing fees: ${summary['cost_breakdown']['landing_fees_usd']:,.2f}")
        print(f"- Operating costs: ${summary['cost_breakdown']['operating_cost_usd']:,.2f}")
        print(f"- Cost per km: ${summary['cost_breakdown']['cost_per_km']:.2f}")
        
        print(f"\nFlight segments:")
        for segment in summary['flight_segments']:
            print(f"{segment['segment_number']}. {segment['from']['code']} → {segment['to']['code']}")
            print(f"   {segment['from']['name']} → {segment['to']['name']}")
            print(f"   Distance: {segment['distance_km']} km")
            print(f"   Fuel needed: {segment['fuel_needed_kg']:.1f} kg")
            print(f"   Segment cost: ${segment['costs']['total_segment_cost_usd']:,.2f}")
            print()
    else:
        print("No route found!")

if __name__ == "__main__":
    example_usage()