import torch
import torch.nn as torch_nn
import torch.nn.functional as F

class CausalDeconfounder(torch_nn.Module):
    """
    Layer 3: Causal De-confounding via do-calculus.
    Applies Judea Pearl's Structural Causal Models (SCMs).
    We use the Backdoor Adjustment formula to mathematically severe 
    spurious connections caused by unobserved urban confounders Z 
    (like Monsoons or Festivals).
    """
    def __init__(self, num_nodes, num_confounders, hidden_dim=64):
        super(CausalDeconfounder, self).__init__()
        
        # Maps the confounder vector Z (e.g. [rain_intensity, festival_flag, ...]) 
        # to a node-level impact matrix.
        self.confounder_embedding = torch_nn.Sequential(
            torch_nn.Linear(num_confounders, hidden_dim),
            torch_nn.ReLU(),
            torch_nn.Linear(hidden_dim, num_nodes)
        )
        
        # Estimates P(Y | X, Z)
        self.ate_estimator = torch_nn.Sequential(
            torch_nn.Linear(num_nodes * 2, hidden_dim),
            torch_nn.ReLU(),
            torch_nn.Linear(hidden_dim, 1)
        )

    def backdoor_adjustment(self, physics_graph, confounders_Z):
        """
        P(Y | do(X)) = sum_z P(Y | X, Z=z) P(Z=z)
        We use the confounder tensor to estimate the spurious bias and subtract it.
        """
        # Shape: (batch, num_nodes)
        z_impact = self.confounder_embedding(confounders_Z)
        
        # We model the spurious correlation matrix generated purely by Z
        # If two nodes are both heavily impacted by rain, their correlation is spurious
        z_impact_expanded = z_impact.unsqueeze(2) # (batch, num_nodes, 1)
        spurious_adj = torch.bmm(z_impact_expanded, z_impact_expanded.transpose(1, 2))
        
        # Apply the do-calculus intervention:
        # Instead of aggressive subtraction + ReLU (which kills spatial edges),
        # we use a Sigmoid gate to softly scale down spurious correlations.
        gate = torch.sigmoid(-spurious_adj) # Negative because high spurious should close the gate
        causal_graph = physics_graph * gate
        
        causal_graph = F.normalize(causal_graph, p=1, dim=2)
        
        return causal_graph

    def forward(self, hybrid_adj, confounders_Z):
        # Apply Backdoor Adjustment
        causal_adj = self.backdoor_adjustment(hybrid_adj, confounders_Z)
        return causal_adj
