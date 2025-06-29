import numpy as np
import csv
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicy
from flightnet.marl.main_algorithm import (
    create_aircraft,
    create_crew_costs_by_region,
    InternationalFlightOptimizer,
    get_airports,
    OptimizationMode
)
import math

def haversine(lat1, lon1, lat2, lon2):
    # Returns distance in km between two lat/lon points
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2*R*math.asin(math.sqrt(a))

# --- RL Segment Predictor ---
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

def get_no_fly_zones():
    nfz_input = input("Enter no-fly zones as comma-separated airport codes (e.g. IRN,AFG), or leave blank for none: ").strip().upper()
    if not nfz_input:
        return set()
    return set(code.strip() for code in nfz_input.split(","))

if __name__ == "__main__":
    # --- 1. Setup Optimizer ---
    aircraft = create_aircraft()
    crew_region = input("Enter crew cost region (e.g. india, uk, us): ").strip().lower()
    crew_costs = create_crew_costs_by_region(crew_region)
    optimizer = InternationalFlightOptimizer(aircraft, crew_costs)

    airports = get_airports()  # <--- Use the shared airport list
    for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
        optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)

    # --- 2. Get best route (with layovers/refueling) ---
    start_code = input("Please enter the starting airport code: ").strip().upper()
    dest_code = input("Please enter the destination airport code: ").strip().upper()
    no_fly_zones = get_no_fly_zones()

    # Patch can_fly_direct to avoid no-fly zones
    orig_can_fly_direct = optimizer.can_fly_direct
    def patched_can_fly_direct(self, from_id, to_id):
        if from_id in no_fly_zones or to_id in no_fly_zones:
            return False
        return orig_can_fly_direct(from_id, to_id)
    optimizer.can_fly_direct = patched_can_fly_direct.__get__(optimizer, InternationalFlightOptimizer)

    routes = optimizer.compare_routes(start_code, dest_code)

    # --- 3. Load RL model ---
    model_path = "flightnet/models/single_agent_policy.zip"
    model = PPO.load(model_path, custom_objects={"policy_class": CustomMLPPolicy})

    print("Segment Details:")
    for mode in ["cheapest", "fastest"]:
        route = routes[mode]
        if "error" in route:
            print(f"\n--- {mode.upper()} ROUTE ---")
            print(route["error"])
            continue

        overview = route['route_overview']
        costs = route['detailed_cost_breakdown']

        print(f"\n--- {mode.upper()} ROUTE ---")
        print(f"Route: {overview['route_path']}")
        print(f"Total Cost: ${overview['total_cost_usd']:,.2f}")
        print(f"Flight Time: {overview['total_flight_time_hours']:.1f} hours")
        print(f"Distance: {overview['total_distance_km']:,.0f} km")
        print(f"Stops: {overview['number_of_stops']}")
        print(f"Crew Rate: {overview['crew_cost_structure']}")

        print(f"\nCost Breakdown:")
        print(f"  Fuel: ${costs['fuel_cost_usd']:,.2f}")
        print(f"  Landing Fees: ${costs['landing_fees_usd']:,.2f}")
        print(f"  Crew: ${costs['crew_cost_usd']:,.2f}")
        print(f"  Maintenance: ${costs['maintenance_cost_usd']:,.2f}")
        print(f"  Other Costs: ${costs['depreciation_cost_usd'] + costs['insurance_cost_usd'] + costs['navigation_fees_usd'] + costs['ground_handling_cost_usd']:,.2f}")

        print(f"\nSegment Details:")
        for seg in route['flight_segments']:
            from_code = seg['from']['code']
            to_code = seg['to']['code']
            start = (optimizer.airports[from_code].lat, optimizer.airports[from_code].lon, 10000)
            dest = (optimizer.airports[to_code].lat, optimizer.airports[to_code].lon, 10000)
            seg_distance = seg['distance_km']
            path, rewards = predict_segment_path(model, start, dest, max_steps=300)
            refuel_info = " (REFUEL)" if seg['refuel_info']['requires_refuel'] else ""
            nfz_violation = from_code in no_fly_zones or to_code in no_fly_zones
            violation_note = " [NO-FLY ZONE VIOLATION]" if nfz_violation else ""
            print(f"  {from_code} → {to_code}: {seg_distance:,.0f}km, steps: {len(path)}, RL reward: {sum(rewards):.1f}${refuel_info}{violation_note}")
        print("\n" + "="*60)