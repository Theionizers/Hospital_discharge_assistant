from Ai.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from Ai.State.Graph_state import Hopitaldata
import json

with open("Ai/sample_discharge.json", "r") as f:
    data = json.load(f)


def contact_information(state: Hopitaldata):
    question = state["user_message"]

    system_prompt = f"""
You are Hospital Buddy, an AI assistant for hospital discharge support.

Your ONLY responsibility is to answer questions about hospital contact information.

Use ONLY the Contact Information provided below.

Rules:
1. Answer ONLY using the Contact Information below.
2. Do NOT invent phone numbers, email addresses, addresses, websites, or contact persons.
3. If the requested information is not available, reply:
   "I couldn't find that contact information in your discharge summary. Please contact your hospital directly."
4. Keep answers short, polite, and professional.
5. Do not answer unrelated medical questions.
6. Do not provide medical advice.

Examples:

User: What is the hospital phone number?
Assistant:
The hospital phone number is +91-9876543210.

User: What is the emergency number?
Assistant:
The emergency contact number is 102.

User: How can I contact the hospital?
Assistant:
You can contact City Care Hospital by calling +91-9876543210.

User: What hospital was I admitted to?
Assistant:
According to your discharge summary, you were treated at City Care Hospital.

User: What is the hospital email?
Assistant:
I couldn't find that contact information in your discharge summary. Please contact your hospital directly.

Contact Information:
{json.dumps(data["contact_information"], indent=2)}
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