import gym
import numpy as np
import random
from gym import spaces

class MultiAircraftEnv(gym.Env):
    def __init__(self, num_agents=2, grid_size=10, max_steps=None, random_start=False):
        super().__init__()
        self.num_agents = num_agents
        self.grid_size = grid_size
        self.max_steps = max_steps or (2 * grid_size)
        self.random_start = random_start
        self.destinations = [np.array([grid_size - 1, grid_size - 1]) for _ in range(num_agents)]
        self.no_fly_zones = [np.array([4, 4]), np.array([5, 5])]
        self.weather_zones = [np.array([2, 2]), np.array([7, 7])]
        self.path_cost = np.random.randint(1, 5, size=(grid_size, grid_size))
        self.wind_directions = [(0,1), (0,-1), (1,0), (-1,0)]
        self.positions = [np.array([0, 0]) for _ in range(num_agents)]
        self.freshness = np.zeros((num_agents, grid_size, grid_size))
        self.steps = 0
        self.observation_space = spaces.Box(low=0, high=grid_size - 1, shape=(6,), dtype=np.float32)
        self.action_space = spaces.Discrete(4)

    def seed(self, seed=None):
        np.random.seed(seed)
        random.seed(seed)

    def reset(self):
        if self.random_start:
            self.positions = [np.array([np.random.randint(0, self.grid_size), np.random.randint(0, self.grid_size)]) for _ in range(self.num_agents)]
        else:
            self.positions = [np.array([0, 0]) for _ in range(self.num_agents)]
        self.freshness = np.zeros((self.num_agents, self.grid_size, self.grid_size))
        self.steps = 0
        return [self._get_obs(i) for i in range(self.num_agents)]

    def _get_obs(self, idx):
        ax, ay = self.positions[idx]
        dx, dy = self.destinations[idx]
        freshness = 1.0 - self.freshness[idx][ax, ay] / self.max_steps
        cost = self.path_cost[ax, ay] / 5.0
        return np.array([ax, ay, dx, dy, freshness, cost], dtype=np.float32)

    def step(self, actions):
        rewards, dones, infos = [], [], []
        self.steps += 1
        for i in range(self.num_agents):
            self.freshness[i][self.positions[i][0], self.positions[i][1]] += 1
            if actions[i] == 0:
                self.positions[i][0] = max(0, self.positions[i][0] - 1)
            elif actions[i] == 1:
                self.positions[i][0] = min(self.grid_size - 1, self.positions[i][0] + 1)
            elif actions[i] == 2:
                self.positions[i][1] = max(0, self.positions[i][1] - 1)
            elif actions[i] == 3:
                self.positions[i][1] = min(self.grid_size - 1, self.positions[i][1] + 1)
            dx, dy = random.choice(self.wind_directions)
            self.positions[i][0] = np.clip(self.positions[i][0] + dx, 0, self.grid_size - 1)
            self.positions[i][1] = np.clip(self.positions[i][1] + dy, 0, self.grid_size - 1)
            conflict = any(np.array_equal(self.positions[i], z) for z in self.no_fly_zones)
            reached = np.array_equal(self.positions[i], self.destinations[i])
            bad_weather = any(np.array_equal(self.positions[i], w) for w in self.weather_zones)
            fuel_penalty = self.path_cost[self.positions[i][0], self.positions[i][1]]
            freshness_penalty = self.freshness[i][self.positions[i][0], self.positions[i][1]]
            progress_reward = -np.linalg.norm(self.positions[i] - self.destinations[i])
            reward = progress_reward - fuel_penalty - freshness_penalty
            done = False
            if conflict:
                reward = -100
                done = True
            elif reached:
                reward = 100 - self.steps
                done = True
            elif self.steps >= self.max_steps:
                reward = -10
                done = True
            elif bad_weather:
                reward -= 20
            info = {
                "steps": self.steps,
                "reached": reached,
                "conflict": conflict,
                "fuel": fuel_penalty,
                "bad_weather": bad_weather,
                "pos": self.positions[i].copy()
            }
            rewards.append(reward)
            dones.append(done)
            infos.append(info)
        observations = [self._get_obs(i) for i in range(self.num_agents)]
        return observations, rewards, dones, infos