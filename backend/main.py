import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import json

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

class LogisticsIntent(BaseModel):
    origin: str
    destination: str
    capacity: int
    confidence: float

# The "System Brain" Prompt
SYSTEM_PROMPT = """
You are 'Vaani', a logistics intent parser for Delhi. 
You extract structured data from Hindi, English, or Hinglish driver speech.

Known Locations in Delhi/NCR: 
[Azadpur Mandi, Okhla, Connaught Place (CP), Rohini, Dwarka, Saket, Nehru Place, Karol Bagh, Lajpat Nagar, Gurgaon, Noida, Ghaziabad, Faridabad, Haridwar, Meerut, Sonipat]

Rules for Extraction:
1. **Origin & Destination (CRITICAL: OUTPUT IN ENGLISH ONLY)**: 
   - Even if the input is Hindi (e.g., "नरेला"), you MUST translate it to English (e.g., "Narela").
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
    print(f"Received Audio Transcript: {request.text}")
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", # Extremely fast & cheap model
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Parse this: '{request.text}'"}
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
