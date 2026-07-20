from langchain.messages import SystemMessage,HumanMessage
from Ai.llm import llm
import json
from pprint import pprint
from langchain_core.output_parsers import StrOutputParser
from Ai.Outputparsers.diet_plan_op import dietop
with open("Ai/sample_discharge.json","r") as f:
    data=json.load(f)



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
4. If the required information is not present in the discharge data, say:
   "I don't have enough information in the discharge summary to answer that."
5. When suggesting foods, provide 2-4 appropriate options.
6. If there are foods the patient should avoid, mention them clearly.
7. Keep responses concise and practical.
8. Never answer questions unrelated to diet. Instead reply:
   "I can only assist with diet and nutrition questions."
"""
    struc_llm=llm.with_structured_output(dietop)
    while(True):
        prompt=input("You: ")
        response=struc_llm.invoke([SystemMessage(content=system_prompt),
                             HumanMessage(content=prompt)])
        pprint(response)

diet_plan()
# import os
# print("API Key:", os.getenv("OPENAI_API_KEY"))
