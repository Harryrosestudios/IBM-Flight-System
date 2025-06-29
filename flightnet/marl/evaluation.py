import gym
import numpy as np
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv

class SingleAgentWrapper(gym.Env):
    def __init__(self):
        super().__init__()
        self.base_env = MultiAircraftEnv(num_agents=1)
        self.observation_space = self.base_env.observation_space
        self.action_space = self.base_env.action_space

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
        return obs[0], rewards[0], dones[0], infos[0]

    def render(self):
        return self.base_env.render()

def evaluate_agent(model_path, episodes=5):
    print(f"\n=== Evaluating Single Agent ===")
    env = SingleAgentWrapper()
    model = PPO.load(model_path, env=env)

    success_count = 0
    total_reward = 0

    for ep in range(episodes):
        obs = env.reset()
        done = False
        ep_reward = 0
        steps = 0
        final_dist = -1

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, done, info = env.step(action)
            env.render()  # <-- Add this line to visualize each step
            ep_reward += reward
            steps += 1
            final_dist = info.get("distance", -1)

        print(f"Episode {ep+1}: Reward={ep_reward:.2f}, Steps={steps}, Final Distance={final_dist:.4f}")
        total_reward += ep_reward
        if ep_reward > 0:
            success_count += 1

    print(f"\nSuccess rate: {success_count}/{episodes}, Avg Reward: {total_reward / episodes:.2f}")

if __name__ == "__main__":
    evaluate_agent("flightnet/models/single_agent_policy.zip", episodes=10)