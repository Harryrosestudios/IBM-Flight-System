import gym
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicy  # <-- Use your custom policy

class MultiAgentWrapper(gym.Env):
    def __init__(self, base_env):
        super().__init__()
        self.env = base_env
        self.num_agents = base_env.num_agents
        self.observation_space = base_env.observation_space
        self.action_space = base_env.action_space

    def reset(self):
        self.obs = self.env.reset()
        return self._combine_obs()

    def step(self, action):
        actions = [action for _ in range(self.num_agents)]
        obs, rewards, dones, infos = self.env.step(actions)
        self.obs = obs
        return self._combine_obs(), np.mean(rewards), all(dones), self._combine_info(infos)

    def _combine_info(self, infos):
        combined = {}
        for info in infos:
            combined.update(info)
        return combined

    def _combine_obs(self):
        return np.mean(np.array(self.obs), axis=0)

    def render(self, mode="human"):
        return self.env.render(mode=mode)

    def seed(self, seed=None):
        if hasattr(self.env, "seed"):
            return self.env.seed(seed)

# # Set random seed for reproducibility
# seed = 42
# np.random.seed(seed)

# # Create environment
# env = DummyVecEnv([lambda: MultiAgentWrapper(MultiAircraftEnv(num_agents=3, random_start=True))])

# # Create and train model (NO callbacks)
# model = PPO(CustomMLPPolicy, env, verbose=1, seed=seed)
# model.learn(total_timesteps=200000)

# # Save only the final model
# model.save("flightnet/models/flightnet_multiagent")
