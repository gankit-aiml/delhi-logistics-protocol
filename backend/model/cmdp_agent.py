import torch
import torch.nn as torch_nn
import torch.optim as optim
from torch.distributions import Categorical

class CMDPPolicyNetwork(torch_nn.Module):
    """
    3-Layer MLP Policy Network for the CMDP Agent.
    Maps the causal spatiotemporal state 's' to routing action probabilities 'pi_theta(a|s)'.
    """
    def __init__(self, state_dim, num_actions, hidden_dim=128):
        super(CMDPPolicyNetwork, self).__init__()
        self.mlp = torch_nn.Sequential(
            torch_nn.Linear(state_dim, hidden_dim),
            torch_nn.ReLU(),
            torch_nn.Linear(hidden_dim, hidden_dim),
            torch_nn.ReLU(),
            torch_nn.Linear(hidden_dim, num_actions),
            torch_nn.Softmax(dim=-1)
        )

    def forward(self, state):
        action_probs = self.mlp(state)
        return action_probs

class CMDPAgent:
    """
    Constrained Markov Decision Process Agent.
    Employs Lagrangian Dual Gradient Ascent to strictly enforce safety constraints
    (e.g., avoiding illegal routes like closed 'Virtual Corridors').
    """
    def __init__(self, state_dim, num_actions, lr_theta=1e-3, lr_lambda=5e-2):
        self.policy = CMDPPolicyNetwork(state_dim, num_actions)
        self.optimizer_theta = optim.Adam(self.policy.parameters(), lr=lr_theta)
        
        # The Lagrangian Multiplier (lambda), initialized to 0.
        # It dynamically scales the penalty for violating constraints.
        self.lagrange_multiplier = torch.tensor(0.0, requires_grad=True)
        # We use a separate optimizer for the dual variable (ascent)
        self.optimizer_lambda = optim.Adam([self.lagrange_multiplier], lr=lr_lambda, maximize=True)

    def select_action(self, state):
        """Samples an action from the policy distribution."""
        action_probs = self.policy(state)
        m = Categorical(action_probs)
        action = m.sample()
        return action.item(), m.log_prob(action)

    def compute_reward_and_cost(self, env_feedback):
        """
        Formulates the Reward (R) and Cost (C) based on simulation feedback.
        R: Maximize throughput / velocity
        C: 1 if illegal maneuver, 0 otherwise. We constrain E[C] <= limit.
        """
        reward = env_feedback.get("throughput", 0.0) - env_feedback.get("deadhead_penalty", 0.0)
        # Cost is 1 if an illegal maneuver is performed, otherwise 0
        cost = 1.0 if env_feedback.get("illegal_maneuver", False) else 0.0
        return reward, cost

    def update(self, log_probs, rewards, costs, cost_limit=0.0):
        """
        Performs the Dual Gradient Ascent update.
        Objective: max_theta min_lambda>0 E[R] - lambda * (E[C] - limit)
        """
        # Calculate expected returns (simplified for demonstration, typically uses advantages)
        R = torch.tensor(rewards, dtype=torch.float32).sum()
        C = torch.tensor(costs, dtype=torch.float32).sum()
        
        # The Lagrangian formulation: L(theta, lambda) = R - lambda * (C - cost_limit)
        # Policy Update (gradient ASCENT on R - lambda*C)
        policy_loss = []
        for log_prob in log_probs:
            # We want to maximize this, so we minimize the negative
            # The penalty is subtracted from the reward
            penalized_return = R - self.lagrange_multiplier.detach() * (C - cost_limit)
            policy_loss.append(-log_prob * penalized_return)
        
        policy_loss = torch.stack(policy_loss).sum()
        
        self.optimizer_theta.zero_grad()
        policy_loss.backward()
        self.optimizer_theta.step()

        # Multiplier Update (gradient ASCENT on lambda * (C - limit))
        # If Cost > Limit, lambda will increase to penalize the policy more heavily next time.
        # If Cost <= Limit, lambda will decrease (clamped to 0).
        lambda_obj = self.lagrange_multiplier * (C - cost_limit)
        
        self.optimizer_lambda.zero_grad()
        lambda_obj.backward()
        self.optimizer_lambda.step()
        
        # Enforce lambda >= 0 (Karush-Kuhn-Tucker condition)
        with torch.no_grad():
            self.lagrange_multiplier.clamp_(min=0.0)
            
        return {
            "reward": R.item(),
            "cost": C.item(),
            "lambda": self.lagrange_multiplier.item()
        }
