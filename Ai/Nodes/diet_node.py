from langchain_core.messages import SystemMessage, HumanMessage
from Ai.llm import llm
import json

with open("Ai/sample_discharge.json", "r") as f:
    data = json.load(f)


def diet_plan():
    system_prompt = f"""
You are the hospital dietitian for a discharge assistant.

Your only source of truth is the patient's discharge information provided below.

Patient Information:
{json.dumps(data["patient"], indent=2)}

Diet Plan:
{json.dumps(data["diet_plan"], indent=2)}

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

    while True:
        prompt = input("You: ")

        if prompt.lower() in {"exit", "quit"}:
            break

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt),
        ])

        print("\nAssistant:\n")
        print(response.text())
        print()

diet_plan()