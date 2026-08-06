from sqlalchemy import (
    DateTime,
    func
)
from Backend.Database.database import Base
from sqlalchemy.orm import Mapped, mapped_column

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)

    created_at = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
