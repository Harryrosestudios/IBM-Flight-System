import math
import heapq
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class Node:
    id: str
    name: str
    lat: float
    lon: float

class ShortestPathFinder:
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.connections: Dict[str, List[str]] = {}
    
    def add_node(self, node_id: str, name: str, lat: float, lon: float):
        """Add a node to the network"""
        self.nodes[node_id] = Node(node_id, name, lat, lon)
        if node_id not in self.connections:
            self.connections[node_id] = []
    
    def add_connection(self, from_id: str, to_id: str, bidirectional: bool = True):
        """Add connection between nodes"""
        if from_id in self.connections:
            if to_id not in self.connections[from_id]:
                self.connections[from_id].append(to_id)
        
        if bidirectional and to_id in self.connections:
            if from_id not in self.connections[to_id]:
                self.connections[to_id].append(from_id)
    
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth
        Returns distance in kilometers
        """
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of Earth in kilometers
        R = 6371
        return R * c
    
    def get_distance_between_nodes(self, node1_id: str, node2_id: str) -> float:
        """Get distance between two nodes"""
        if node1_id not in self.nodes or node2_id not in self.nodes:
            return float('inf')
        
        node1 = self.nodes[node1_id]
        node2 = self.nodes[node2_id]
        
        return self.haversine_distance(node1.lat, node1.lon, node2.lat, node2.lon)
    
    def dijkstra_shortest_path(self, start_id: str, end_id: str) -> Tuple[List[str], float]:
        """
        Find shortest path using Dijkstra's algorithm
        Returns: (path, total_distance)
        """
        if start_id not in self.nodes or end_id not in self.nodes:
            return [], float('inf')
        
        # Initialize distances and previous nodes
        distances = {node_id: float('inf') for node_id in self.nodes}
        previous = {node_id: None for node_id in self.nodes}
        distances[start_id] = 0
        
        # Priority queue: (distance, node_id)
        pq = [(0, start_id)]
        visited = set()
        
        while pq:
            current_distance, current_id = heapq.heappop(pq)
            
            if current_id in visited:
                continue
            
            visited.add(current_id)
            
            # If we reached the destination
            if current_id == end_id:
                break
            
            # Check all neighbors
            if current_id in self.connections:
                for neighbor_id in self.connections[current_id]:
                    if neighbor_id in visited:
                        continue
                    
                    # Calculate distance to neighbor
                    edge_distance = self.get_distance_between_nodes(current_id, neighbor_id)
                    new_distance = distances[current_id] + edge_distance
                    
                    # If we found a shorter path
                    if new_distance < distances[neighbor_id]:
                        distances[neighbor_id] = new_distance
                        previous[neighbor_id] = current_id
                        heapq.heappush(pq, (new_distance, neighbor_id))
        
        # Reconstruct path
        path = []
        current = end_id
        while current is not None:
            path.append(current)
            current = previous[current]
        
        # If no path found
        if len(path) == 1 and path[0] != start_id:
            return [], float('inf')
        
        path.reverse()
        return path, distances[end_id]
    
    def find_all_shortest_paths(self, start_id: str) -> Dict[str, Tuple[List[str], float]]:
        """
        Find shortest paths from start node to all other nodes
        Returns: {destination_id: (path, distance)}
        """
        if start_id not in self.nodes:
            return {}
        
        distances = {node_id: float('inf') for node_id in self.nodes}
        previous = {node_id: None for node_id in self.nodes}
        distances[start_id] = 0
        
        pq = [(0, start_id)]
        visited = set()
        
        while pq:
            current_distance, current_id = heapq.heappop(pq)
            
            if current_id in visited:
                continue
            
            visited.add(current_id)
            
            if current_id in self.connections:
                for neighbor_id in self.connections[current_id]:
                    if neighbor_id in visited:
                        continue
                    
                    edge_distance = self.get_distance_between_nodes(current_id, neighbor_id)
                    new_distance = distances[current_id] + edge_distance
                    
                    if new_distance < distances[neighbor_id]:
                        distances[neighbor_id] = new_distance
                        previous[neighbor_id] = current_id
                        heapq.heappush(pq, (new_distance, neighbor_id))
        
        # Reconstruct all paths
        results = {}
        for end_id in self.nodes:
            if end_id == start_id:
                results[end_id] = ([start_id], 0.0)
                continue
            
            path = []
            current = end_id
            while current is not None:
                path.append(current)
                current = previous[current]
            
            if len(path) > 1:  # Valid path found
                path.reverse()
                results[end_id] = (path, distances[end_id])
            else:
                results[end_id] = ([], float('inf'))
        
        return results
    
    def get_path_details(self, path: List[str]) -> Dict:
        """Get detailed information about a path"""
        if len(path) < 2:
            return {"error": "Path must have at least 2 nodes"}
        
        details = {
            "path": path,
            "node_names": [self.nodes[node_id].name for node_id in path],
            "segments": [],
            "total_distance": 0
        }
        
        total_distance = 0
        for i in range(len(path) - 1):
            from_node = self.nodes[path[i]]
            to_node = self.nodes[path[i + 1]]
            
            segment_distance = self.get_distance_between_nodes(path[i], path[i + 1])
            total_distance += segment_distance
            
            segment = {
                "from": {"id": from_node.id, "name": from_node.name},
                "to": {"id": to_node.id, "name": to_node.name},
                "distance_km": round(segment_distance, 2)
            }
            details["segments"].append(segment)
        
        details["total_distance"] = round(total_distance, 2)
        return details
    
    def print_network_summary(self):
        """Print summary of the network"""
        print(f"Network Summary:")
        print(f"- Nodes: {len(self.nodes)}")
        print(f"- Total connections: {sum(len(connections) for connections in self.connections.values())}")
        print("\nNodes:")
        for node_id, node in self.nodes.items():
            connections_count = len(self.connections.get(node_id, []))
            print(f"  {node_id}: {node.name} ({node.lat:.4f}, {node.lon:.4f}) - {connections_count} connections")


# Example usage
def example_usage():
    """Example of how to use the ShortestPathFinder"""
    
    # Create path finder
    finder = ShortestPathFinder()
    
    # Add some major cities as example nodes
    cities = [
        ("NYC", "New York", 40.7128, -74.0060),
        ("LAX", "Los Angeles", 34.0522, -118.2437),
        ("CHI", "Chicago", 41.8781, -87.6298),
        ("MIA", "Miami", 25.7617, -80.1918),
        ("SEA", "Seattle", 47.6062, -122.3321),
        ("DEN", "Denver", 39.7392, -104.9903)
    ]
    
    # Add nodes
    for city_id, name, lat, lon in cities:
        finder.add_node(city_id, name, lat, lon)
    
    # Add connections (create a connected network)
    connections = [
        ("NYC", "CHI"), ("NYC", "MIA"),
        ("CHI", "DEN"), ("CHI", "SEA"),
        ("LAX", "DEN"), ("LAX", "SEA"),
        ("DEN", "SEA"), ("MIA", "DEN")
    ]
    
    for from_id, to_id in connections:
        finder.add_connection(from_id, to_id)
    
    # Print network summary
    finder.print_network_summary()
    
    # Find shortest path between two cities
    print(f"\n{'='*50}")
    print("Finding shortest path from NYC to LAX:")
    path, distance = finder.dijkstra_shortest_path("NYC", "LAX")
    
    if path:
        print(f"Path found: {' -> '.join(path)}")
        print(f"Total distance: {distance:.2f} km")
        
        # Get detailed path information
        details = finder.get_path_details(path)
        print("\nPath details:")
        for i, segment in enumerate(details["segments"], 1):
            print(f"  {i}. {segment['from']['name']} -> {segment['to']['name']}: {segment['distance_km']} km")
    else:
        print("No path found!")
    
    # Find all shortest paths from NYC
    print(f"\n{'='*50}")
    print("All shortest paths from NYC:")
    all_paths = finder.find_all_shortest_paths("NYC")
    
    for destination, (path, distance) in all_paths.items():
        if destination != "NYC" and path:  # Skip self and invalid paths
            city_names = " -> ".join([finder.nodes[node_id].name for node_id in path])
            print(f"  To {finder.nodes[destination].name}: {distance:.2f} km via {city_names}")

if __name__ == "__main__":
    example_usage()