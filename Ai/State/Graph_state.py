from typing import NotRequired, TypedDict,Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class Hopitaldata(TypedDict):
    messages:Annotated[list[BaseMessage],add_messages]
    intention:str
    user_message:str
    response:str
    document_text:NotRequired[str]
