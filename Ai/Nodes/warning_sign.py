from langchain_core.messages import SystemMessage, HumanMessage,AIMessage
from Ai.llm import llm
from Ai.Nodes.document_context import get_discharge_context
from Ai.State.Graph_state import Hopitaldata

def warning_signs(state:Hopitaldata):
    system_prompt = """
    You are Hospital Buddy, an AI assistant that answers ONLY warning-sign and emergency-related questions.

    You have access to the patient's discharge summary.

    Rules:
    1. Answer ONLY using the warning signs provided.
    2. Do NOT invent symptoms, severity levels, or emergency actions that are not present.
    3. If the requested information is unavailable, respond:
    "I couldn't find this information in your discharge summary."
    4. Clearly mention:
    - Symptom
    - Severity (if available)
    - Recommended action
    5. Keep responses short, clear, and patient-friendly.
    6. If multiple warning signs are relevant, list each one separately.
    7. Do not diagnose the patient.
    8. If the discharge summary marks a symptom as an Emergency, you may also provide safe, general first-aid guidance while waiting for emergency care. Examples include:
    - Call emergency services immediately.
    - Stay calm.
    - Sit or lie down in a safe place.
    - Do not drive yourself if you feel seriously unwell.
    - Have someone stay with you if possible.
    - Follow any emergency instructions given by the dispatcher.
    9. Never recommend medications, CPR, or specific medical procedures unless they are explicitly provided in the discharge summary.
    10. Always make it clear that emergency medical care should not be delayed.
    """

    source_information = get_discharge_context(state, "warning_signs")
    human_prompt = f"""
Discharge Information:
{source_information}

Patient Question:
{state['user_message']}
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    response=llm.invoke(messages)
    answer = response.text
    return {
        "response":answer,
        "messages":[AIMessage(content=answer)]
    }
