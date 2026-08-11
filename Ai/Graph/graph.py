from Ai.Nodes.diet_node import diet_plan
from Ai.Nodes.warning_sign import warning_signs
from Ai.Nodes.General_node import general
from Ai.Nodes.start_node import start_node
from Ai.Nodes.start_router import start_router
from Ai.Nodes.medication import medication
from Ai.Nodes.life_style_advise import life_style
from Ai.Nodes.simple_explanation import simple_explanation
from Ai.Nodes.contact_information import contact_information
from Ai.Nodes.patient import patient
from Ai.Nodes.medicine_timetable import medication_timetable
from Ai.Nodes.tests import tests
from Ai.Nodes.exercise_restriction import exercise_restrictions

from Ai.State.Graph_state import Hopitaldata
from langgraph.graph import StateGraph, START, END
from uuid import uuid4


def _content_to_text(content) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                text_parts.append(
                    item.get("text")
                    or item.get("content")
                    or item.get("delta")
                    or ""
                )
        return "".join(text_parts)

    if isinstance(content, dict):
        return (
            content.get("text")
            or content.get("content")
            or content.get("delta")
            or ""
        )

    return ""


def build_graph():
    builder = StateGraph(Hopitaldata)

    # -------------------- Nodes --------------------

    builder.add_node("start", start_node)
    builder.add_node("router", start_router)

    builder.add_node("diet", diet_plan)
    builder.add_node("warning", warning_signs)
    builder.add_node("general", general)
    builder.add_node("medication", medication)
    builder.add_node("life_style_advise", life_style)
    builder.add_node("simple_explanation", simple_explanation)
    builder.add_node("contact_information", contact_information)
    builder.add_node("patient", patient)
    builder.add_node("medicine_timetable", medication_timetable)
    builder.add_node("tests", tests)
    builder.add_node("exercise_restrictions", exercise_restrictions)

    # -------------------- Edges --------------------

    builder.add_edge(START, "start")
    builder.add_edge("start", "router")

    builder.add_conditional_edges(
        "router",
        lambda state: state["intention"],
        {
            "diet_plan": "diet",
            "medications": "medication",
            "medicine_timetable": "medicine_timetable",
            "exercise_restrictions": "exercise_restrictions",
            "warning_signs": "warning",
            "patient": "patient",
            "follow_up": "general",
            "tests": "tests",
            "lifestyle_advice": "life_style_advise",
            "contact_information": "contact_information",
            "simple_explanation": "simple_explanation",
            "general": "general",
        },
    )

    # -------------------- End Edges --------------------

    builder.add_edge("diet", END)
    builder.add_edge("medication", END)
    builder.add_edge("medicine_timetable", END)
    builder.add_edge("exercise_restrictions", END)
    builder.add_edge("warning", END)
    builder.add_edge("patient", END)
    builder.add_edge("tests", END)
    builder.add_edge("life_style_advise", END)
    builder.add_edge("contact_information", END)
    builder.add_edge("simple_explanation", END)
    builder.add_edge("general", END)

    return builder


def invoke_workflow(
    user_message: str,
    *,
    thread_id: str | None = None,
    document_text: str | None = None,
) -> dict:
    state = {
        "user_message": user_message,
        "messages": [],
        "intention": "",
        "response": "",
    }
    if document_text:
        state["document_text"] = document_text

    config = {
        "configurable": {
            "thread_id": thread_id or f"thread_{uuid4().hex}"
        }
    }

    final_response = ""
    final_intention = ""
    final_state = state

    graph = build_graph().compile(checkpointer=False)
    for chunk in graph.stream(state, config=config, stream_mode="updates"):
        for node_output in chunk.values():
            if "response" in node_output:
                final_response = node_output["response"]
            if "intention" in node_output:
                final_intention = node_output["intention"]
            final_state.update(node_output)

    return {
        "thread_id": config["configurable"]["thread_id"],
        "intention": final_intention or final_state.get("intention", ""),
        "response": final_response or final_state.get("response", ""),
    }


def stream_workflow(
    user_message: str,
    *,
    thread_id: str | None = None,
    document_text: str | None = None,
):
    state = {
        "user_message": user_message,
        "messages": [],
        "intention": "",
        "response": "",
    }
    if document_text:
        state["document_text"] = document_text

    config = {
        "configurable": {
            "thread_id": thread_id or f"thread_{uuid4().hex}"
        }
    }

    final_response = ""
    final_intention = ""
    final_state = state
    emitted_text = False

    graph = build_graph().compile(checkpointer=False)

    for stream_mode, chunk in graph.stream(
        state,
        config=config,
        stream_mode=["messages", "updates"],
    ):
        if stream_mode == "messages":
            message_chunk, _metadata = chunk
            token = _content_to_text(getattr(message_chunk, "content", ""))
            if token:
                emitted_text = True
                yield {
                    "type": "token",
                    "content": token,
                }
            continue

        if stream_mode == "updates":
            for node_output in chunk.values():
                if "response" in node_output:
                    final_response = node_output["response"]
                if "intention" in node_output:
                    final_intention = node_output["intention"]
                final_state.update(node_output)

    response_text = final_response or final_state.get("response", "")

    if response_text and not emitted_text:
        yield {
            "type": "token",
            "content": response_text,
        }

    yield {
        "type": "done",
        "thread_id": config["configurable"]["thread_id"],
        "intention": final_intention or final_state.get("intention", ""),
        "response": response_text,
    }


def chat_cli():
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

        print("\nAssistant: ", end="", flush=True)
        result = invoke_workflow(user_input, thread_id=config["configurable"]["thread_id"])
        print(result["response"], end="", flush=True)

        print("\n" + "-" * 60)


if __name__ == "__main__":
    chat_cli()
        
