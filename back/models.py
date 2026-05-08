from sqlalchemy import Column, Float, JSON, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    language = Column(String(2), default="en")
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    s3_url = Column(String, nullable=True)
    source = Column(String(20), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class SkinAnalysis(Base):
    __tablename__ = "skin_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    analysis_data = Column(String, nullable=False)
    skin_problems = Column(String, nullable=True)
    recommendations = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    name = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    nutrition_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())