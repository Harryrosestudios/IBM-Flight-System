import time
import random
from flightnet.env.airline_env import AirlineEnv

RENDER_DELAY = 0.3  # seconds between steps
MAX_EPISODES = 1    # Set >1 to run multiple episodes

for episode in range(MAX_EPISODES):
    print(f"\n=== Episode {episode + 1} ===")
    env = AirlineEnv(grid_size=6, random_start=True)
    obs = env.reset()
    done = False
    total_reward = 0
    step_count = 0

    while not done:
        env.render()
        action = random.choice([0, 1, 2, 3])  # Replace with agent policy later
        obs, reward, done, info = env.step(action)
        total_reward += reward
        step_count += 1

        print(f"[Step {step_count}] Action: {action} → Pos: {obs.tolist()} | Reward: {reward}")
        time.sleep(RENDER_DELAY)

    env.render()
    print(f"🏁 Episode completed in {step_count} steps")
    print(f"🏆 Final reward: {total_reward}")
    print(f"📦 Info: {info}")
