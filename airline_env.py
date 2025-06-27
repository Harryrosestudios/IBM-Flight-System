import gym
import numpy as np
from gym import spaces

class AirlineEnv(gym.Env):
    def __init__(self, grid_size=10):
        super().__init__()
        self.grid_size = grid_size
        self.agent_pos = [0, 0]
        self.destination = [grid_size - 1, grid_size - 1]
        self.no_fly_zones = [[4, 4], [5, 5]]
        
        self.observation_space = spaces.Box(low=0, high=grid_size-1, shape=(2,), dtype=np.int32)
        self.action_space = spaces.Discrete(4)  # 0:Up, 1:Down, 2:Left, 3:Right

    def reset(self):
        self.agent_pos = [0, 0]
        return np.array(self.agent_pos, dtype=np.int32)

    def step(self, action):
        # Move agent
        if action == 0: self.agent_pos[0] = max(0, self.agent_pos[0] - 1)  # Up
        elif action == 1: self.agent_pos[0] = min(self.grid_size - 1, self.agent_pos[0] + 1)  # Down
        elif action == 2: self.agent_pos[1] = max(0, self.agent_pos[1] - 1)  # Left
        elif action == 3: self.agent_pos[1] = min(self.grid_size - 1, self.agent_pos[1] + 1)  # Right

        reward = -1  # time/fuel penalty by default
        done = False

        if self.agent_pos in self.no_fly_zones:
            reward = -100
            done = True
        elif self.agent_pos == self.destination:
            reward = 100
            done = True

        return np.array(self.agent_pos, dtype=np.int32), reward, done, {}

    def render(self, mode='human'):
        grid = [['.' for _ in range(self.grid_size)] for _ in range(self.grid_size)]
        x, y = self.agent_pos
        dx, dy = self.destination
        grid[x][y] = 'A'
        grid[dx][dy] = 'D'
        for z in self.no_fly_zones:
            grid[z[0]][z[1]] = 'X'
        for row in grid:
            print(' '.join(row))
        print()
