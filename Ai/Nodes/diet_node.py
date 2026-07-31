from langchain_core.messages import SystemMessage, HumanMessage,AIMessage
from Ai.State.Graph_state import Hopitaldata
from Ai.llm import llm
from Ai.Nodes.document_context import get_discharge_context


def diet_plan(state:Hopitaldata):
    source_information = get_discharge_context(
        state,
        "patient",
        "diet_plan"
    )
    system_prompt = f"""
You are the hospital dietitian for a discharge assistant.

Your only source of truth is the patient's discharge information provided below.

Discharge Information:
{source_information}

Rules:
1. Answer ONLY diet and nutrition related questions.
2. Base every answer strictly on the provided diet plan and patient information.
3. Do NOT invent foods, restrictions, timings, or medical advice.
4. If the required information is not present in the discharge summary, say:
   "I don't have enough information in the discharge summary to answer that."
5. Suggest only foods that are consistent with the discharge diet.
6. Mention foods to avoid if applicable.
7. Prefer Indian food options whenever possible.
8. Keep the response patient-friendly.
9. Format the response like this:

🍽️ What to Eat
- ...

🚫 What to Avoid
- ...

💧 Lifestyle Tips
- ...

10. Never answer questions unrelated to diet. If asked something else, reply:
"I can only assist with diet and nutrition questions."
"""

    prompt=state['user_message']

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt),
    ])
    answer = response.text
    return {
        "response":answer,
        "messages": [
        AIMessage(content=answer)
    ]
    }
