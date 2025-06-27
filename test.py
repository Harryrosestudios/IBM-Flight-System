import time
import random
from airline_env import AirlineEnv

env = AirlineEnv()
obs = env.reset()
done = False

while not done:
    env.render()
    action = random.choice([0, 1, 2, 3])  # replace with your agent later
    obs, reward, done, info = env.step(action)
    time.sleep(0.5)

env.render()
print("Final reward:", reward)
