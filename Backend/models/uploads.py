from sqlalchemy import Column,Integer,String,DateTime,Text
from sqlalchemy.sql import func
from Backend.Database.database import Base

class Document(Base):
    __tablename__="documents"

    id=Column(Integer,primary_key=True,index=True)

    original_name=Column(String,nullable=False)
    stored_name=Column(String,nullable=False,unique=True)

    file_path=Column(String,nullable=False)
    content_type=Column(String,nullable=False,default="application/pdf")
    file_size=Column(Integer,nullable=False,default=0)
    extracted_text=Column(Text,nullable=True)
    workflow_response=Column(Text,nullable=True)
    uploaded_at=Column(DateTime(timezone=True),
                       server_default=func.now())
