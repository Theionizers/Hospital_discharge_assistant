from Ai.llm import llm
from pprint import pprint
import json
from Ai.State.Graph_state import Hopitaldata
with open('Ai/sample_discharge.json','r') as f:
    data=json.load(f)

def start_node(state:Hopitaldata):
    
    WELCOME_MESSAGE = (
        f"Hi! {data['patient']['name']} I'm Hospital Buddy. How can I help you today?"
    )

    return {
        "response":WELCOME_MESSAGE
    }

