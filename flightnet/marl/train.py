import gym
import numpy as np
import csv
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from sklearn.metrics import mean_squared_error
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicy  # <-- Import your custom policy

# Load expert trajectories (optional, can skip shaping for now)
def load_expert_trajectories(file_path):
    expert_data = {}
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            agent_id = row['agent_id']  # Use string, not int
            if agent_id not in expert_data:
                expert_data[agent_id] = []
            obs = [float(row[k]) for k in ['lat', 'lon', 'alt', 'dlat', 'dlon', 'dalt']]
            action = [float(row[k]) for k in ['dx', 'dy', 'dz']]
            expert_data[agent_id].append((obs, action))
    return expert_data

class SingleAgentWrapper(gym.Env):
    def __init__(self, expert_trajectories=None, region="india"):
        super().__init__()
        self.base_env = MultiAircraftEnv(num_agents=1)
        self.observation_space = self.base_env.observation_space
        self.action_space = self.base_env.action_space
        # Use expert trajectories for the selected region
        self.expert_trajectories = expert_trajectories.get(region, []) if expert_trajectories else []
        self.step_count = 0

    def reset(self):
        obs = self.base_env.reset()
        self.step_count = 0
        return obs[0]

    def step(self, action):
        action = np.asarray(action, dtype=np.float32).flatten()
        if action.shape[0] != 3:
            raise ValueError(f"Action must be of shape (3,), got {action.shape}")
        action = [float(x) for x in action]
        obs, rewards, dones, infos = self.base_env.step([action])

        # Reward shaping with expert guidance
        if self.step_count < len(self.expert_trajectories):
            _, expert_action = self.expert_trajectories[self.step_count]
            shaping_penalty = mean_squared_error(expert_action, action)
            rewards[0] -= 0.1 * shaping_penalty  # Penalize deviation from expert

        self.step_count += 1
        return obs[0], rewards[0], dones[0], infos[0]

    def render(self, mode='human'):
        return self.base_env.render(mode=mode)

if __name__ == "__main__":
    expert_data = load_expert_trajectories("flightnet/data/expert_routes.csv")
    # Choose region: "india", "uk", or "us"
    region = "india"
    env = DummyVecEnv([lambda: SingleAgentWrapper(expert_data, region=region)])  # Pass expert data
    env = VecNormalize(env, norm_obs=True, norm_reward=True)

    model = PPO(
        CustomMLPPolicy,
        env,
        verbose=1,
        learning_rate=1e-4,
        n_steps=2048,
        batch_size=1024,
        device='cpu'
    )  # <-- Use your custom policy here
    model.learn(total_timesteps=400_000)
    model.save("flightnet/models/single_agent_policy")

    print("\n✅ Training complete for single agent.")