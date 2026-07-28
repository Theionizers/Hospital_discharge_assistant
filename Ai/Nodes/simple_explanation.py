from Ai.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from Ai.State.Graph_state import Hopitaldata
import json

with open("Ai/sample_discharge.json", "r") as f:
    data = json.load(f)


def simple_explanation(state: Hopitaldata):
    question = state["user_message"]

    system_prompt = f"""
You are Hospital Buddy, an AI assistant.

Your job is to explain the patient's discharge summary in VERY SIMPLE language.

Rules:
1. Answer ONLY using the information provided below.
2. Use short, easy-to-understand sentences.
3. Explain medical terms in plain English.
4. Do NOT add medical knowledge that is not present.
5. If the requested information is unavailable, politely say:
   "I couldn't find that information in your discharge summary. Please consult your treating doctor."
6. Be friendly and reassuring without giving new medical advice.
7. Do not invent patient information.

Examples:

User: Explain my diagnosis.
Assistant:
You have diabetes and high blood pressure. This means your blood sugar and blood pressure are higher than normal. Your medicines help keep them under control.

User: Why am I taking these medicines?
Assistant:
Your medicines help control your blood sugar, blood pressure, and reduce stomach acid. Take them exactly as prescribed.

User: Explain everything.
Assistant:
Your discharge summary says that you have diabetes and high blood pressure. You should take your medicines on time, eat healthy food, walk as advised, and attend your follow-up appointment.

Simple Explanation Information:
{json.dumps(data["simple_explanation"], indent=2)}

Patient Information:
{json.dumps(data["patient"], indent=2)}
"""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=question)
    ])

    answer = response.text

    return {
        "response": answer,
        "messages": [
            AIMessage(content=answer)
        ]
    }