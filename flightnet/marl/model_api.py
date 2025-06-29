from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Set, Dict, Any
import numpy as np
from stable_baselines3 import PPO
from flightnet.env.airline_env import MultiAircraftEnv
from flightnet.marl.policy import CustomMLPPolicy
from flightnet.marl.main_algorithm import (
    create_aircraft,
    create_crew_costs_by_region,
    InternationalFlightOptimizer,
    get_airports,
)
import math

app = FastAPI()

class RouteRequest(BaseModel):
    start_code: str
    dest_code: str
    crew_region: str
    no_fly_zones: Set[str] = set()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2*R*math.asin(math.sqrt(a))

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

def predict_segment_path(model, start, dest, max_steps=200):
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
        if done:
            break
    return path, rewards

@app.post("/predict_route")
def predict_route(req: RouteRequest):
    aircraft = create_aircraft()
    crew_costs = create_crew_costs_by_region(req.crew_region)
    optimizer = InternationalFlightOptimizer(aircraft, crew_costs)
    airports = get_airports()
    for airport_id, name, lat, lon, fuel_price, landing_fee, country in airports:
        optimizer.add_airport(airport_id, name, lat, lon, fuel_price, landing_fee, country)

    orig_can_fly_direct = optimizer.can_fly_direct
    def patched_can_fly_direct(self, from_id, to_id):
        if from_id in req.no_fly_zones or to_id in req.no_fly_zones:
            return False
        return orig_can_fly_direct(from_id, to_id)
    optimizer.can_fly_direct = patched_can_fly_direct.__get__(optimizer, InternationalFlightOptimizer)

    routes = optimizer.compare_routes(req.start_code.upper(), req.dest_code.upper())

    model_path = "flightnet/models/single_agent_policy.zip"
    model = PPO.load(model_path, custom_objects={"policy_class": CustomMLPPolicy})

    results = {}
    for mode in ["cheapest", "fastest"]:
        route = routes[mode]
        if "error" in route:
            results[mode] = {"error": route["error"]}
            continue

        overview = route['route_overview']
        costs = route['detailed_cost_breakdown']
        segs = []
        for seg in route['flight_segments']:
            from_code = seg['from']['code']
            to_code = seg['to']['code']
            start = (optimizer.airports[from_code].lat, optimizer.airports[from_code].lon, 10000)
            dest = (optimizer.airports[to_code].lat, optimizer.airports[to_code].lon, 10000)
            seg_distance = seg['distance_km']
            path, rewards = predict_segment_path(model, start, dest, max_steps=300)
            refuel_info = "REFUEL" if seg['refuel_info']['requires_refuel'] else ""
            nfz_violation = from_code in req.no_fly_zones or to_code in req.no_fly_zones
            segs.append({
                "from": from_code,
                "to": to_code,
                "distance_km": seg_distance,
                "steps": len(path),
                "rl_reward": float(np.sum(rewards)),
                "refuel": refuel_info,
                "no_fly_zone_violation": nfz_violation
            })
        results[mode] = {
            "route": overview['route_path'],
            "total_cost_usd": overview['total_cost_usd'],
            "total_flight_time_hours": overview['total_flight_time_hours'],
            "total_distance_km": overview['total_distance_km'],
            "number_of_stops": overview['number_of_stops'],
            "crew_cost_structure": overview['crew_cost_structure'],
            "cost_breakdown": {
                "fuel": costs['fuel_cost_usd'],
                "landing_fees": costs['landing_fees_usd'],
                "crew": costs['crew_cost_usd'],
                "maintenance": costs['maintenance_cost_usd'],
                "other": costs['depreciation_cost_usd'] + costs['insurance_cost_usd'] + costs['navigation_fees_usd'] + costs['ground_handling_cost_usd']
            },
            "segments": segs
        }
    return results