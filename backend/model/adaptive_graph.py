import torch
import torch.nn as torch_nn
import torch.nn.functional as F

class NodeAdaptiveLearning(torch_nn.Module):
    """
    Layer 1a: Data-Driven Graph Discovery (Inspired by Zhao et al. STCGAT).
    Learns dynamic spatial dependencies without relying strictly on physical distances.
    """
    def __init__(self, num_nodes, embed_dim, in_channels, out_channels):
        super(NodeAdaptiveLearning, self).__init__()
        self.num_nodes = num_nodes
        self.embed_dim = embed_dim
        
        # We initialize the embeddings with a smaller scale to prevent exploding gradients
        self.node_embed = torch_nn.Parameter(torch.randn(num_nodes, embed_dim) * 0.1)
        
        # We also learn temporal dynamics over the incoming feature traffic
        self.tcn = torch_nn.Conv1d(in_channels, out_channels, kernel_size=3, padding=1)
        
    def forward(self, x):
        # 1. Generate the adaptive spatial adjacency matrix
        # E = ReLU(E_1 * E_2^T)
        # Softmax normalization ensures it sums to 1, preventing gradient explosions
        adaptive_adj = torch.softmax(torch.matmul(self.node_embed, self.node_embed.T), dim=-1)
        return adaptive_adj

class TemporalCausalConv(torch_nn.Module):
    """
    Layer 1b: Temporal Convolutional Network (TCN).
    Captures long-term global temporal patterns using dilated causal convolutions.
    """
    def __init__(self, in_channels, out_channels, kernel_size, dilation):
        super(TemporalCausalConv, self).__init__()
        # Causal padding ensures future data doesn't leak into the past
        self.padding = (kernel_size - 1) * dilation
        self.conv = torch_nn.Conv1d(in_channels, out_channels, kernel_size,
                                    padding=self.padding, dilation=dilation)
        
    def forward(self, x):
        # x shape: (batch_size, in_channels, sequence_length)
        out = self.conv(x)
        # Remove padding from the right end to maintain causality
        out = out[:, :, :-self.padding]
        return F.relu(out)

class Layer1_DataDriven(torch_nn.Module):
    """
    Combines NAL and TCN for the pure data-driven phase of the Triad Architecture.
    """
    def __init__(self, num_nodes, embed_dim, in_channels, out_channels):
        super(Layer1_DataDriven, self).__init__()
        self.nal = NodeAdaptiveLearning(num_nodes, embed_dim)
        # Stack of TCNs with increasing dilation for larger receptive field
        self.tcn1 = TemporalCausalConv(in_channels, out_channels, kernel_size=2, dilation=1)
        self.tcn2 = TemporalCausalConv(out_channels, out_channels, kernel_size=2, dilation=2)
        
    def forward(self, x):
        # 1. Discover data-driven graph structure
        adaptive_adj = self.nal(x)
        
        # 2. Extract global temporal features
        # Assuming x comes in as (batch, nodes, features, time)
        batch_size, num_nodes, features, time_steps = x.shape
        
        # Merge batch and nodes for 1D temporal convolution
        x_reshaped = x.reshape(batch_size * num_nodes, features, time_steps)
        
        # Apply Temporal Causal Convolution
        tcn_out = self.tcn1(x_reshaped)
        tcn_out = self.tcn2(tcn_out)
        
        # Reshape back to (batch, nodes, out_channels, time_steps)
        tcn_out = tcn_out.reshape(batch_size, num_nodes, -1, time_steps)
        
        return adaptive_adj, tcn_out
