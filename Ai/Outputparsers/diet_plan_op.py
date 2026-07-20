from pydantic import BaseModel,Field

class dietop(BaseModel):
    diet:list[str]=Field(
        description="2 to 3 meals"
    )
    avoid:list[str]=Field(description="the items to avoid while eating not to be added in diet")
    notes:str