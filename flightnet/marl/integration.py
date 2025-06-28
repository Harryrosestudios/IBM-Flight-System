import numpy as np
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicyAgent0
from flightnet.marl.temp import (
    create_aircraft,
    create_crew_costs_by_region,
    InternationalFlightOptimizer,
)

def get_airport_coords(airport_id, airports_dict):
    airport = airports_dict[airport_id]
    # You may want to set a fixed initial altitude, e.g., 10000 ft
    return airport.lat, airport.lon, 10000

def run_rl_for_segment(start_coords, end_coords, model_path):
    env = MultiAircraftEnv(num_agents=1)
    env.reset()  # <-- Initialize positions and destinations
    env.positions[0] = np.array(start_coords)
    env.destinations[0] = np.array(end_coords)
    obs = env._get_obs(0)
    model = PPO.load(model_path, custom_objects={"policy_class": CustomMLPPolicyAgent0})

    done = False
    total_reward = 0
    steps = 0
    while not done and steps < 500:
        action, _ = model.predict(obs, deterministic=True)
        obs_list, rewards, dones, infos = env.step([action])
        obs = obs_list[0]
        total_reward += rewards[0]
        done = dones[0]
        steps += 1

    return total_reward, steps, infos[0]

if __name__ == "__main__":
    # === SETUP OPTIMIZER ===
    aircraft = create_aircraft()
    crew_costs = create_crew_costs_by_region("india")
    optimizer = InternationalFlightOptimizer(aircraft, crew_costs)

    # Add airports (copy from your temp.py or load as needed)
    airports = [
        ("DEL", "Indira Gandhi Intl Delhi", 28.5562, 77.1000, 0.82, 1800, "India"),
        ("BOM", "Mumbai Chhatrapati Shivaji", 19.0896, 72.8656, 0.84, 1900, "India"),
        ("DXB", "Dubai International", 25.2532, 55.3657, 0.78, 1800, "UAE"),
        ("LHR", "London Heathrow", 51.4700, -0.4543, 0.92, 3200, "UK"),
        ("JFK", "New York JFK", 40.6413, -73.7781, 0.85, 2500, "USA"),
        # ... add more as needed ...
    ]
    for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
        optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)

    # === GET OPTIMIZED ROUTE ===
    route = optimizer.optimize_route("DEL", "JFK")
    print("Optimized route:", " → ".join(route.path))

    # === RL AGENT FLIES EACH SEGMENT ===
    model_path = "flightnet/models/agent_0_policy.zip"  # Path to your trained RL model
    for i in range(len(route.path) - 1):
        start_id = route.path[i]
        end_id = route.path[i + 1]
        start_coords = get_airport_coords(start_id, optimizer.airports)
        end_coords = get_airport_coords(end_id, optimizer.airports)
        print(f"\nSegment {i+1}: {start_id} → {end_id}")
        reward, steps, info = run_rl_for_segment(start_coords, end_coords, model_path)
        print(f"  RL agent: reward={reward:.2f}, steps={steps}, final info={info}")

    print("\nIntegration complete.")