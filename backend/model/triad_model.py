import torch
import torch.nn as torch_nn
from .adaptive_graph import Layer1_DataDriven
from .physics_prior import TrafficPhysicsPrior
from .causal_engine import CausalDeconfounder

class TriadCausalSTGNN(torch_nn.Module):
    """
    The Master Model linking all 3 Layers of the Triad Architecture.
    """
    def __init__(self, num_nodes, embed_dim, in_channels, out_channels, num_confounders, physical_adj):
        super(TriadCausalSTGNN, self).__init__()
        
        # Layer 1: Data-Driven Graph (NAL & TCN)
        self.layer1 = Layer1_DataDriven(num_nodes, embed_dim, in_channels, out_channels)
        
        # Layer 2: Physics-Aware Structural Prior
        self.layer2 = TrafficPhysicsPrior(physical_adj)
        
        # Layer 3: Causal De-confounding
        self.layer3 = CausalDeconfounder(num_nodes, num_confounders)
        
        # Final output projection to map spatiotemporal sequence down to desired forecasting horizon
        # (Assuming standard benchmark settings where time=12)
        self.output_proj = torch_nn.Linear(out_channels * 12, 12)

    def forward(self, x, confounders_Z):
        """
        x: (batch, nodes, features, time)
        confounders_Z: (batch, num_confounders)
        """
        # Step 1: Learn the latent data-driven correlations
        adaptive_adj, tcn_features = self.layer1(x)
        
        # Step 2: Ground the data-driven graph in Traffic PDEs
        # Expand adaptive adj for batch if necessary, 
        # assuming adaptive_adj is (num_nodes, num_nodes) and physical_adj is same
        # For simplicity, we assume static batch-independent topological structure for L1/L2
        hybrid_adj = self.layer2(adaptive_adj)
        
        # Expand for batch size for L3 (since confounders vary per batch/time)
        batch_size = x.shape[0]
        hybrid_adj_batch = hybrid_adj.unsqueeze(0).expand(batch_size, -1, -1)
        
        # Step 3: Strip away spurious correlations using do-calculus
        causal_adj = self.layer3(hybrid_adj_batch, confounders_Z)
        
        # Final Graph Convolution
        # tcn_features shape: (batch, nodes, out_channels, time)
        # Spatiotemporal Fusion (Do not slice the final time step!)
        batch, nodes, channels, time = tcn_features.shape
        tcn_flat = tcn_features.reshape(batch, nodes, channels * time)
        
        # Message passing over the purified causal graph
        # causal_adj is (batch, nodes, nodes)
        causal_node_embeddings = torch.bmm(causal_adj, tcn_flat)
        
        # Final projection to forecast horizon
        causal_node_embeddings = self.output_proj(causal_node_embeddings)
        
        return causal_node_embeddings, causal_adj
