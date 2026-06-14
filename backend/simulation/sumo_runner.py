import os
import traci
import sumolib
import random
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")
SUMO_FILES_DIR = os.path.join(BASE_DIR, "simulation", "sumo_files")

os.makedirs(SUMO_FILES_DIR, exist_ok=True)

class SUMORunner:
    def __init__(self, use_gui=False):
        self.use_gui = use_gui
        self.net_file = os.path.join(SUMO_FILES_DIR, "delhi.net.xml")
        self.route_file = os.path.join(SUMO_FILES_DIR, "delhi.rou.xml")
        self.sumo_cmd = ["sumo-gui" if use_gui else "sumo", 
                         "-n", self.net_file, 
                         "-r", self.route_file,
                         "--step-length", "1"]

    def generate_dummy_network_if_missing(self):
        """
        In a full run, we convert the downloaded OSM graphml to a .net.xml
        using the 'netconvert' tool provided by SUMO.
        For now, we mock this process to ensure the pipeline runs.
        """
        if not os.path.exists(self.net_file):
            print("Generating SUMO network from OSM (Mocked for now)...")
            # Actual command would be:
            # os.system(f"netconvert --osm-files {osm_file} -o {self.net_file}")
            with open(self.net_file, 'w') as f:
                f.write('<!-- Mock Net File -->\n<net>\n</net>')
                
        if not os.path.exists(self.route_file):
            print("Generating SUMO routes from Probe Counts (Mocked for now)...")
            with open(self.route_file, 'w') as f:
                f.write('<!-- Mock Route File -->\n<routes>\n</routes>')

    def start_simulation(self):
        self.generate_dummy_network_if_missing()
        
        # We need a valid net file to start traci, so we check if it's just our mock
        with open(self.net_file, 'r') as f:
            content = f.read()
        
        if "Mock Net File" in content:
            print("Simulation requires a valid .net.xml generated via netconvert.")
            print("To run physically, install SUMO and run netconvert on the OSM map.")
            print("Proceeding in 'Mathematical Surrogate' mode...")
            return False
            
        traci.start(self.sumo_cmd)
        return True

    def inject_confounder(self, edge_id, severity="high"):
        """
        Programmatically trigger traffic disruptions (e.g. monsoon flooding).
        This acts as the 'Z' confounder for the Causal model.
        """
        if severity == "high":
            speed_limit = 0.5  # drastically reduce speed to simulate flooding
        else:
            speed_limit = 5.0
            
        print(f"[CONFOUNDER INJECTED] Reducing capacity on {edge_id} (Severity: {severity})")
        traci.edge.setMaxSpeed(edge_id, speed_limit)

    def run_step(self):
        """Steps the simulation forward by 1 tick."""
        traci.simulationStep()
        
        # Randomly inject festival/monsoon disruptions (Hawkes Process mock)
        if random.random() < 0.01: # 1% chance per tick
            # In reality, pick a random active edge
            # edge_id = random.choice(traci.edge.getIDList())
            # self.inject_confounder(edge_id)
            pass

    def get_state(self):
        """Extracts real-time vehicle density for the CMDP State Space."""
        # state = {}
        # for edge in traci.edge.getIDList():
        #     state[edge] = traci.edge.getLastStepVehicleNumber(edge)
        # return state
        return {}

    def close(self):
        traci.close()

if __name__ == "__main__":
    runner = SUMORunner(use_gui=False)
    success = runner.start_simulation()
    
    if success:
        print("Simulation started.")
        for i in range(100):
            runner.run_step()
        runner.close()
        print("Simulation ended.")
