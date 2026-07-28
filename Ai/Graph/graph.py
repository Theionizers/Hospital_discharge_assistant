from Ai.Nodes.diet_node import diet_plan
from Ai.Nodes.warning_sign import warning_signs
from Ai.Nodes.General_node import general
from Ai.Nodes.start_node import start_node
from Ai.Nodes.start_router import start_router
from Ai.Nodes.medication import medication
from Ai.Nodes.life_style_advise import life_style
from Ai.Nodes.simple_explanation import simple_explanation

from Ai.State.Graph_state import Hopitaldata
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

builder = StateGraph(Hopitaldata)

builder.add_node("start", start_node)
builder.add_node("router", start_router)
builder.add_node("diet", diet_plan)
builder.add_node("warning", warning_signs)
builder.add_node("general", general)
builder.add_node("medication", medication)
builder.add_node("life_style_advise", life_style)
builder.add_node("simple_explanation", simple_explanation)

builder.add_edge(START, "start")
builder.add_edge("start", "router")

builder.add_conditional_edges(
    "router",
    lambda state: state["intention"],
    {
        "diet_plan": "diet",
        "medications": "medication",
        "warning_signs": "warning",
        "general": "general",
        "lifestyle_advice":"life_style_advise",
        "simple_explanation":"simple_explanation"
    },
)

builder.add_edge("diet", END)
builder.add_edge("medication", END)
builder.add_edge("warning", END)
builder.add_edge("general", END)


with SqliteSaver.from_conn_string("chat_memory.db") as memory:
    graph = builder.compile(checkpointer=memory)

    config = {
        "configurable": {
            "thread_id": "user_2"
        }
    }

    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ")

        if user_input.lower() in ["exit", "quit"]:
            break

        state = {
            "user_message": user_input,
            "messages": [],
            "intention": "",
            "response": ""
        }

        result = graph.invoke(state, config=config)

        print("\nAssistant:")
        print(result["response"])
        print("-" * 50)