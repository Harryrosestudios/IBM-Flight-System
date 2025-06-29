import torch as th
import torch.nn as nn
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
from stable_baselines3.common.policies import ActorCriticPolicy

class CustomFeatureExtractor(BaseFeaturesExtractor):
    """
    Custom feature extractor for flight environment.
    Uses a moderately deep MLP for generalization.
    """
    def __init__(self, observation_space, features_dim=128):
        super().__init__(observation_space, features_dim)
        input_dim = observation_space.shape[0]
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, features_dim),
            nn.ReLU(),
        )

    def forward(self, x):
        return self.net(x)

class CustomMLPPolicy(ActorCriticPolicy):
    """
    Custom MLP policy using the above feature extractor.
    """
    def __init__(self, observation_space, action_space, lr_schedule, **kwargs):
        super().__init__(
            observation_space,
            action_space,
            lr_schedule,
            features_extractor_class=CustomFeatureExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            **kwargs,
        )