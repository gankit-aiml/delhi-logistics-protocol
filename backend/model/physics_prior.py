import torch
import torch.nn as torch_nn

class TrafficPhysicsPrior(torch_nn.Module):
    """
    Layer 2: Physics-Aware Structural Prior.
    Applies macroscopic traffic flow theory (Continuity Equation) to ground
    the data-driven adaptive graph in physical reality.
    
    Continuity Eq: d(rho)/dt + d(q)/dx = 0
    Vehicles cannot teleport. The density (rho) at node i at time t 
    must be caused by flow (q) from its physical upstream neighbors at t-1.
    """
    def __init__(self, physical_adj_matrix):
        super(TrafficPhysicsPrior, self).__init__()
        # The true physical adjacency matrix from OSM / SUMO
        # Shape: (num_nodes, num_nodes), binary 1 if connected, 0 otherwise
        self.register_buffer('physical_adj', physical_adj_matrix)
        
        # Learnable parameter to weigh how strongly we enforce the physics prior
        # vs the data-driven discovery.
        self.physics_weight = torch_nn.Parameter(torch.tensor(0.5))
        
    def forward(self, adaptive_adj):
        """
        Combines the data-driven adaptive graph with the physics structural prior.
        """
        # Ensure the physics weight stays between 0 and 1
        alpha = torch.sigmoid(self.physics_weight)
        
        # The physical adjacency restricts impossible flows (teleportation).
        # We perform an element-wise multiplication (masking) to severely penalize 
        # data-driven edges that violate physics, while still allowing some leeway
        # (e.g. for informal, unmapped dirt roads, but heavily discounted).
        
        # We blend the pure data-driven matrix with the masked matrix.
        physics_constrained_adj = adaptive_adj * self.physical_adj
        
        # Hybrid Triad Blend:
        # alpha * pure_physics_graph + (1 - alpha) * data_driven_graph
        hybrid_adj = (alpha * physics_constrained_adj) + ((1 - alpha) * adaptive_adj)
        
        # Normalize
        hybrid_adj = torch.nn.functional.normalize(hybrid_adj, p=1, dim=1)
        
        return hybrid_adj
