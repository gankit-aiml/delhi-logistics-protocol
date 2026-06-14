import os
import json
import geopandas as gpd
import osmnx as ox
import networkx as nx
from shapely.geometry import shape

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "..", "new_delhi_traffic_dataset")
GEOJSON_FILE = os.path.join(DATASET_DIR, "geojson", "new_delhi.json")
FEATURES_FILE = os.path.join(DATASET_DIR, "facility", "features_geopkg.json")
PROBE_COUNTS_DIR = os.path.join(DATASET_DIR, "probe_counts", "geojson")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")

os.makedirs(PROCESSED_DIR, exist_ok=True)

def load_delhi_polygon():
    """Loads the New Delhi bounding polygon from GeoJSON."""
    with open(GEOJSON_FILE, "r") as f:
        data = json.load(f)
    geom = shape(data["geometry"])
    return geom

def download_road_network(polygon):
    """Downloads the road network graph within the polygon using osmnx."""
    print("Downloading OSM road network for New Delhi... (This may take a while)")
    # We want driveable roads for logistics
    G = ox.graph_from_polygon(polygon, network_type="drive", simplify=True)
    print(f"Downloaded graph with {len(G.nodes)} nodes and {len(G.edges)} edges.")
    return G

def save_graph(G, filename="delhi_base_network.graphml"):
    """Saves the graph for later use."""
    filepath = os.path.join(PROCESSED_DIR, filename)
    ox.save_graphml(G, filepath)
    print(f"Saved graph to {filepath}")
    return filepath

def load_facilities():
    """Loads the facility categories mapping."""
    with open(FEATURES_FILE, "r") as f:
        data = json.load(f)
    return data["facilities"]

def process_dataset():
    print("--- Phase 1: Real-World Environment & Data Engineering ---")
    
    # 1. Load Polygon
    delhi_poly = load_delhi_polygon()
    print("Loaded New Delhi bounding polygon.")
    
    # 2. Download Network
    # Note: For production, we might want to check if it already exists to save time
    graph_path = os.path.join(PROCESSED_DIR, "delhi_base_network.graphml")
    if os.path.exists(graph_path):
        print(f"Loading existing network from {graph_path}")
        G = ox.load_graphml(graph_path)
    else:
        G = download_road_network(delhi_poly)
        save_graph(G)
    
    # 3. Load Facility Mapping
    facilities = load_facilities()
    print(f"Loaded {len(facilities)} facility categories.")
    
    # In a full run, we would map the features onto the nodes of G here.
    # We would also parse the massive probe_count GeoJSONs and map the hourly flow
    # to the edges of G. Given the size (100MB+ per file), this should be done
    # chunk-by-chunk or using Dask/GeoPandas optimizations.
    
    print("Dataset parsing module initialized successfully.")
    
if __name__ == "__main__":
    process_dataset()
