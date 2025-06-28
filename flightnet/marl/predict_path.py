import numpy as np
import csv
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicy
from flightnet.marl.temp import (
    create_aircraft,
    create_crew_costs_by_region,
    InternationalFlightOptimizer,
)

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

    def render(self):
        self.env.render()

def predict_segment_path(model, start, dest, max_steps=200, save_csv=None, render=False):
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
        if render:
            env.render()
        if done:
            break

    if save_csv:
        with open(save_csv, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["step", "lat", "lon", "alt", "reward"])
            for i, (pos, r) in enumerate(zip(path, [0]+rewards)):
                writer.writerow([i] + pos + [r])
        print(f"Segment trajectory saved to {save_csv}")

    return path, rewards

if __name__ == "__main__":
    # --- 1. Setup Optimizer ---
    aircraft = create_aircraft()
    crew_costs = create_crew_costs_by_region("india")
    optimizer = InternationalFlightOptimizer(aircraft, crew_costs)

    # Add airports (copy from your temp.py or load as needed)
    airports = [
        ("DEL", "Indira Gandhi Intl Delhi", 28.5562, 77.1000, 0.82, 1800, "India"),
        ("DXB", "Dubai International", 25.2532, 55.3657, 0.78, 1800, "UAE"),
        ("LHR", "London Heathrow", 51.4700, -0.4543, 0.92, 3200, "UK"),
        ("JFK", "New York JFK", 40.6413, -73.7781, 0.85, 2500, "USA"),
        # ... add more as needed ...
    ]
    for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
        optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)

    # --- 2. Specify no-fly zones and tank capacity if needed ---
    optimizer.no_fly_zones = [("IRN", "AFG")]  # implement in your optimizer if not present

    # --- 3. Get best route (with layovers/refueling) ---
    route = optimizer.optimize_route("DEL", "JFK")  # Add constraints as needed
    print("Optimized airport sequence:", " → ".join(route.path))

    # --- 4. Load RL model ---
    model_path = "flightnet/models/single_agent_policy.zip"
    model = PPO.load(model_path, custom_objects={"policy_class": CustomMLPPolicy})

    # --- 5. Predict and save each segment path ---
    for i in range(len(route.path) - 1):
        start_airport = optimizer.airports[route.path[i]]
        end_airport = optimizer.airports[route.path[i+1]]
        start = (start_airport.lat, start_airport.lon, 10000)
        dest = (end_airport.lat, end_airport.lon, 10000)
        print(f"\nSegment {i+1}: {route.path[i]} → {route.path[i+1]}")
        seg_csv = f"flightnet/data/predicted_path_{i+1}.csv"
        path, rewards = predict_segment_path(
            model,
            start,
            dest,
            max_steps=300,
            save_csv=seg_csv,
            render=True
        )
        print(f"Segment {i+1} path length: {len(path)}")

    print("\nAll segments predicted and saved.")