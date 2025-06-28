import gym
import numpy as np
import random
import requests
from gym import spaces
from math import radians, cos, sin
import os
from dotenv import load_dotenv
load_dotenv("project.env")

# === CONFIG ===
LAT_RANGE = (20.0, 30.0)
LON_RANGE = (70.0, 85.0)
ALT_RANGE = (5000, 40000)  # in feet

def normalize(val, min_val, max_val):
    return (val - min_val) / (max_val - min_val)

def denormalize(norm_val, min_val, max_val):
    return norm_val * (max_val - min_val) + min_val

def sample_location():
    return (
        random.uniform(*LAT_RANGE),
        random.uniform(*LON_RANGE),
        random.uniform(*ALT_RANGE)
    )

def fetch_weather(lat, lon):
    API_KEY = os.getenv("WEATHER")  
    url = (
        f"https://api.openweathermap.org/data/2.5/weather?"
        f"lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    )
    response = requests.get(url)
    return response.json()

def extract_wind_vector(weather_data):
    try:
        speed = weather_data["wind"]["speed"]  # m/s
        deg = weather_data["wind"]["deg"]      # degrees
    except KeyError:
        return 0.0, 0.0

    rad = radians(deg)
    dx = speed * cos(rad)
    dy = speed * sin(rad)
    return dx, dy


# === ENVIRONMENT ===
class MultiAircraftEnv(gym.Env):
    def __init__(self, num_agents=2, max_steps=200):
        super().__init__()
        self.num_agents = num_agents
        self.max_steps = max_steps
        self.steps = 0
        self.dones = [False] * num_agents

        # Position and destination: [lat, lon, alt]
        self.positions = []
        self.destinations = []

        # Wind from weather
        self.wind_vector = (0.0, 0.0)

        # Observation: 8D normalized vector
        self.observation_space = spaces.Box(low=0.0, high=1.0, shape=(8,), dtype=np.float32)

        # Continuous movement in lat/lon/alt
        self.action_space = spaces.Box(low=-1.0, high=1.0, shape=(3,), dtype=np.float32)

    def seed(self, seed=None):
        self.np_random, seed = gym.utils.seeding.np_random(seed)
        random.seed(seed)
        return [seed]

    def reset(self, seed=None, options=None):
        if seed is not None:
            self.seed(seed)
        self.steps = 0
        self.dones = [False] * self.num_agents
        self.positions = []
        self.destinations = []

        for _ in range(self.num_agents):
            pos = sample_location()
            dest = sample_location()
            self.positions.append(np.array(pos))
            self.destinations.append(np.array(dest))

        # Fetch weather at first agent location
        lat, lon, _ = self.positions[0]
        weather = fetch_weather(lat, lon)
        self.wind_vector = extract_wind_vector(weather)

        obs = [self._get_obs(i) for i in range(self.num_agents)]
        return obs

    def _get_obs(self, i):
        lat, lon, alt = self.positions[i]
        dlat, dlon, dalt = self.destinations[i]

        obs = [
            normalize(lat, *LAT_RANGE),
            normalize(lon, *LON_RANGE),
            normalize(alt, *ALT_RANGE),
            normalize(dlat, *LAT_RANGE),
            normalize(dlon, *LON_RANGE),
            normalize(dalt, *ALT_RANGE),
            0.0,  # Placeholder: freshness
            0.0   # Placeholder: cost
        ]
        # Should return a numpy array
        return np.array(obs, dtype=np.float32)

    def step(self, actions):
        self.steps += 1
        rewards, infos = [], []

        for i in range(self.num_agents):
            if self.dones[i]:
                rewards.append(0.0)
                infos.append({"done": True})
                continue

            lat, lon, alt = self.positions[i]
            dlat, dlon, dalt = self.destinations[i]

            # Calculate prev_dist BEFORE updating position
            prev_dist = abs(lat - dlat) + abs(lon - dlon) + abs(alt - dalt)

            dx, dy, dz = map(float, actions[i])
            lat += dx * 0.05  # ~5km north-south
            lon += dy * 0.05  # ~5km east-west
            alt += dz * 500   # change altitude ~500 ft

            # Apply wind
            lat += self.wind_vector[1] * 0.001
            lon += self.wind_vector[0] * 0.001

            # Clamp to limits
            lat = np.clip(lat, *LAT_RANGE)
            lon = np.clip(lon, *LON_RANGE)
            alt = np.clip(alt, *ALT_RANGE)

            self.positions[i] = np.array([lat, lon, alt])

            dist = abs(lat - dlat) + abs(lon - dlon) + abs(alt - dalt)
            progress = prev_dist - dist
            reward = progress * 10 - 0.01  # Encourage progress, small step penalty

            # Check if reached
            if dist < 0.1:
                reward += 100
                self.dones[i] = True

            # Time limit
            elif self.steps >= self.max_steps:
                self.dones[i] = True

            rewards.append(reward)
            infos.append({"distance": dist, "done": self.dones[i]})

        # rewards[0] -= 0.1 * shaping_penalty  # Try 0.1, 0.05, etc.

        return [self._get_obs(i) for i in range(self.num_agents)], rewards, self.dones, infos

    def render(self, mode='human'):
        for i, (pos, dest) in enumerate(zip(self.positions, self.destinations)):
            print(f"Agent {i}: Position={pos}, Destination={dest}")
