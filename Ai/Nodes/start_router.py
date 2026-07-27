from pprint import pprint
from Ai.llm import llm
from langchain.messages import HumanMessage,SystemMessage,AIMessage
from Ai.State.Graph_state import Hopitaldata


def start_router(state:Hopitaldata):
    system_prompt = """
You are a routing assistant for a Hospital Discharge Assistant.

Your ONLY job is to classify the user's question into ONE category.

Available categories:

{
    "patient": "Patient demographics, diagnosis, age, gender, admission, discharge date",
    "medications": "Medicine names, dosage, timing, frequency, before/after food, missed dose",
    "medicine_timetable": "Daily medication schedule and reminders",
    "diet_plan": "Recommended foods, foods to avoid, diet instructions",
    "exercise_restrictions": "Allowed activities, restrictions, physical exercise",
    "warning_signs": "Emergency symptoms, danger signs, when to visit the hospital",
    "follow_up": "Doctor appointments, revisit date, follow-up instructions",
    "tests": "Blood tests, lab investigations, imaging",
    "lifestyle_advice": "Sleep, hydration, smoking, alcohol, lifestyle recommendations",
    "contact_information": "Hospital contact numbers, emergency contact",
    "simple_explanation": "Simple explanation of the discharge summary"
}

Rules:
1. Return ONLY one category.
2. Do NOT explain your reasoning.
3. Output must be exactly one of the category names.
4. If the question doesn't belong to any category, return:
general

Examples:

User: When should I take Metformin?
Output: medications

User: What should I eat?
Output: diet_plan

User: Can I go for a walk?
Output: exercise_restrictions

User: What symptoms are dangerous?
Output: warning_signs

User: When is my next appointment?
Output: follow_up

User: Explain my discharge summary.
Output: simple_explanation

User: What is my age?
Output: patient

User: Hello
Output: general
"""

    prompt=state['user_message']
    response=llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])
    return {
        "intention":response.text.strip(),
    }
