import numpy as np
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.train import MultiAgentWrapper

model = PPO.load("flightnet/models/flightnet_multiagent")
print("Model loaded, starting evaluation...")

env = MultiAgentWrapper(MultiAircraftEnv(num_agents=3))
num_episodes = 20

all_rewards = []
all_conflicts = []
all_lengths = []

for episode in range(num_episodes):
    obs = env.reset()
    done = False
    ep_reward = 0
    ep_conflict = 0
    steps = 0

    while not done:
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, done, info = env.step(action)
        ep_reward += reward
        ep_conflict += int(info.get("conflict", False))
        steps += 1

    all_rewards.append(ep_reward)
    all_conflicts.append(ep_conflict)
    all_lengths.append(steps)

print("Average Reward:", np.mean(all_rewards))
print("Average Conflicts per Episode:", np.mean(all_conflicts))
print("Average Episode Length:", np.mean(all_lengths))
