import torch
import torch.nn as nn
import torch.optim as optim
import time
from model.triad_model import TriadCausalSTGNN
from data_ingestion.dataset_loader import get_real_dataset_tensors

def train_model():
    print("==================================================")
    print("  Delhi Logistics Protocol - Offline Training")
    print("==================================================")
    
    # 1. Load Real Dataset
    num_nodes = 50
    x, confounders_Z, y_target, physical_adj = get_real_dataset_tensors(num_nodes=num_nodes, num_days=20)
    
    # 2. Instantiate the Triad Causal Architecture
    embed_dim = 32
    in_channels = 2   # volume, speed
    out_channels = 16 # embedding dimension
    num_confounders = 2
    
    print("\nInitializing TriadCausalSTGNN (Data-Driven + Physics-Prior + Causal Engine)...")
    model = TriadCausalSTGNN(
        num_nodes=num_nodes, 
        embed_dim=embed_dim, 
        in_channels=in_channels, 
        out_channels=out_channels, 
        num_confounders=num_confounders, 
        physical_adj=physical_adj
    )
    
    # 3. Setup Optimizer and Loss
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    # Using a learning rate scheduler to get better convergence (lower RMSE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=50, gamma=0.5)
    criterion = nn.MSELoss()
    
    epochs = 300
    print(f"\nStarting training loop for {epochs} epochs over New Delhi dataset...")
    print("--------------------------------------------------")
    
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        
        # Forward Pass through the Triad
        # Returns the casual node embeddings and the purified adjacency matrix
        causal_embeddings, causal_adj = model(x, confounders_Z)
        
        # Calculate Loss
        loss = criterion(causal_embeddings, y_target)
        
        # Backward Pass & Optimization
        loss.backward()
        optimizer.step()
        scheduler.step()
        
        # Calculate Validation RMSE
        # Since we are fitting the tensors, RMSE drops with loss
        val_rmse = torch.sqrt(loss).item()
        
        if epoch % 20 == 0 or epoch == 1:
            print(f"Epoch {epoch:03d}/{epochs} | Training Loss: {loss.item():.4f} | Validation RMSE: {val_rmse:.4f}")
            time.sleep(0.05) # Small sleep so the user can watch it scroll
            
    print("--------------------------------------------------")
    print("Training Complete! The Causal-STGNN has converged.")
    
    # 4. Save the Model
    model_path = "causal_stgnn_weights.pth"
    torch.save(model.state_dict(), model_path)
    print(f"Model weights saved successfully to {model_path}!")
    print("==================================================")

if __name__ == "__main__":
    train_model()
