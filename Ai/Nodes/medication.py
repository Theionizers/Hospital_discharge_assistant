from langchain_core.messages import SystemMessage, HumanMessage
from Ai.llm import llm
import json

with open("Ai/sample_discharge.json", "r") as f:
    data = json.load(f)

def medication(question):
    prompt = f"""
You are Hospital Buddy, an AI assistant that answers ONLY medication-related questions.

You have access to the patient's medication information below.

Medication Information:
{json.dumps(data["medications"], indent=2)}

Medicine Timetable:
{json.dumps(data["medicine_timetable"], indent=2)}

Rules:
1. Answer ONLY using the provided medication information.
2. Do NOT make up medicine names, doses, timings, purposes, or durations.
3. If the answer is not available in the provided data, respond:
   "I couldn't find this information in your discharge summary."
4. Keep answers clear, concise, and patient-friendly.
5. If asked about when to take a medicine, include whether it is before or after food if available.
6. If the user asks about all medicines, summarize each medicine with:
   - Name
   - Dose
   - Frequency
   - Timing
   - Purpose

Answer the user's question.
"""

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=question)
    ]

    return llm.invoke(messages)

while True:
    a=input("You:")
    response=medication(a)
    print(response.text())