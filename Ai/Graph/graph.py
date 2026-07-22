from Ai.Nodes.diet_node import diet_plan
from Ai.Nodes.warning_sign import warning_signs
from Ai.Nodes.General_node import general
from Ai.Nodes.start_node import start_node
from Ai.Nodes.start_router import start_router
from Ai.Nodes.medication import medication

from Ai.State.Graph_state import Hopitaldata
from langgraph.graph import StateGraph,START,END

builder = StateGraph(Hopitaldata)

builder.add_node("start", start_node)
builder.add_node("router", start_router)
builder.add_node("diet", diet_plan)
builder.add_node("warning", warning_signs)
builder.add_node("general", general)
builder.add_node("medication", medication)

builder.add_edge(START,"start")
builder.add_conditional_edges("router",lambda state: state["intention"],
    {
        "diet_plan": "diet",
        "medications": "medication",
        "warning_signs": "warning",
        "general": "general",
    })

builder.add_edge("diet", END)
builder.add_edge("medication", END)
builder.add_edge("warning", END)
builder.add_edge("general", END)

graph = builder.compile()

initial_state = {
    "messages": [
        {"role": "user", "content": "What should I eat?"}
    ],
    "intention": ""
}

result = graph.invoke(initial_state)

print(result)