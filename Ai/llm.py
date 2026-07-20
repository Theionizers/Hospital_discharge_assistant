import os
from dotenv import load_dotenv
load_dotenv()
from langchain_openai import ChatOpenAI

llm=ChatOpenAI(
    model="gpt-5-nano",
    api_key=os.getenv("OPENAI_API_KEY"),
    # max_completion_tokens=300,
    reasoning={"effort": "minimal"},
)