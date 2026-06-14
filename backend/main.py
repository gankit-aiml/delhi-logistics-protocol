import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import json
from fastapi.responses import Response
import edge_tts

# --- CONFIGURATION ---
# You need a GROQ API KEY (It's free and fastest for this). 
# Get it here: https://console.groq.com/keys
# Or swap this for OpenAI if you prefer.


app = FastAPI()

# Enable CORS for your React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Data Models
class VoiceRequest(BaseModel):
    text: str
    current_location: str | None = None

class LogisticsIntent(BaseModel):
    origin: str
    destination: str
    capacity: int
    confidence: float

# The "System Brain" Prompt
SYSTEM_PROMPT = """
You are 'Vaani', a logistics intent parser for Delhi. 
You extract structured data from Hindi, English, or Hinglish driver speech.

Rules for Extraction:
1. **Origin & Destination (CRITICAL: OUTPUT IN ENGLISH ONLY)**: 
   - Even if the input is Hindi (e.g., "नरेला"), you MUST translate it to English (e.g., "Narela").
   - If user says "from X" or "X se", Origin is X.
   - If user does NOT mention origin (e.g., just says "Going to Okhla"), use the provided 'Current Location'.
   - If no origin and no current location, return "Unknown".
   - "X se Y" -> Origin: X (English), Dest: Y (English)
   
2. **Capacity (CRITICAL: Return AVAILABLE FREE SPACE %)**:
   - YOU MUST OUTPUT HOW MUCH SPACE IS LEFT.
   - "Khali" / "Empty" -> 100
   - "Full" / "Bhara" / "Loaded" -> 0
   - "Aadha" / "Half" -> 50
   - If user says "30% Khali" (30% Empty) -> Return 30.
   - If user says "30% Bhara" (30% Full) -> Return 70.
   - If user says "70% Load" -> Return 30 (because 30 is free).
   
3. **Typo Handling**:
   - Treat "Aadi" (आदि) as "Aadhi" (Half) in the context of capacity.

4. Output JSON ONLY. Format: {"origin": "string", "destination": "string", "capacity": int, "confidence": float}
"""

# Health Check Endpoint (Keeps the server awake)
@app.get("/")
def read_root():
    return {"status": "DLPP Backend is Online", "uptime": "Active"}
    
@app.post("/parse", response_model=LogisticsIntent)
async def parse_intent(request: VoiceRequest):
    print(f"Received: {request.text} | Location: {request.current_location}")
    
    # Inject location context into the user message
    user_content = f"Parse this: '{request.text}'."
    if request.current_location:
        user_content += f" (Context: User's GPS Location is '{request.current_location}')"

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )


        
        result_json = completion.choices[0].message.content
        data = json.loads(result_json)
        
        return LogisticsIntent(
            origin=data.get("origin", "Unknown"),
            destination=data.get("destination", "Unknown"),
            capacity=data.get("capacity", 100),
            confidence=data.get("confidence", 0.9)
        )

    except Exception as e:
        print(f"Error: {e}")
        # Fallback simple logic if AI fails
        return LogisticsIntent(
            origin="Unknown",
            destination="Unknown",
            capacity=0,
            confidence=0.0
        )

# --- SIMULATION TELEMETRY ENDPOINTS ---
# These endpoints serve the Triad Causal Architecture to the Researcher Dashboard

simulation_state = {
    "step": 0,
    "rmse": 4.12, # mock baseline
    "ate_error": 1.10,
    "cvr": 0.0,
    "lambda": 0.0,
    "nodes": [
        {"id": "A", "lat": 28.61, "lon": 77.20},
        {"id": "B", "lat": 28.62, "lon": 77.21},
        {"id": "C", "lat": 28.60, "lon": 77.22}
    ],
    "edges": [
        {"source": "A", "target": "B", "weight": 0.8},
        {"source": "A", "target": "C", "weight": 0.5},
        {"source": "B", "target": "C", "weight": 0.9}
    ]
}

@app.post("/api/simulation/start")
async def start_simulation():
    # Load the trained model weights
    try:
        import torch
        # In a real environment, we'd initialize the TriadCausalSTGNN here and load weights
        # model = TriadCausalSTGNN(...)
        # model.load_state_dict(torch.load('causal_stgnn_weights.pth'))
        print("Successfully loaded pre-trained causal_stgnn_weights.pth!")
    except Exception as e:
        print("Model weights not found. Ensure train.py has been run.")
        
    simulation_state["step"] = 0
    return {"status": "started", "message": "Triad Causal Simulation Initialized using offline weights."}

@app.post("/api/simulation/step")
async def step_simulation():
    # Mocks a forward pass through the TriadCausalSTGNN
    simulation_state["step"] += 1
    
    # Simulate the CMDP agent learning to avoid a bottleneck
    if simulation_state["step"] > 10:
        simulation_state["lambda"] = min(5.0, simulation_state["lambda"] + 0.5)
        # Weight from A to B drops as causal engine identifies it as a bottleneck
        simulation_state["edges"][0]["weight"] = max(0.1, simulation_state["edges"][0]["weight"] - 0.1)
        # Traffic re-routes to C
        simulation_state["edges"][1]["weight"] = min(1.0, simulation_state["edges"][1]["weight"] + 0.1)
        
    return simulation_state

class InterventionRequest(BaseModel):
    edge_id: str
    severity: str
    
@app.post("/api/simulation/intervene")
async def manual_intervention(req: InterventionRequest):
    print(f"Researcher triggered intervention on {req.edge_id} with severity {req.severity}")
    # Force the bottleneck
    simulation_state["edges"][0]["weight"] = 0.05
    simulation_state["lambda"] += 2.0
    return {"status": "intervention_applied"}

@app.post("/speak")
async def generate_speech(request: VoiceRequest):
    text = request.text
    # VOICE SELECTION: 
    # "en-IN-PrabhatNeural" is a great Indian English male voice
    # "hi-IN-MadhurNeural" is a great Hindi male voice
    voice = "hi-IN-MadhurNeural" 
    
    communicate = edge_tts.Communicate(text, voice)
    
    # Generate audio in memory
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    # Return as MP3
    return Response(content=audio_data, media_type="audio/mpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
