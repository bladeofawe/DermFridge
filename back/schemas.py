from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime



class UserBase(BaseModel):
    email: EmailStr
    language: Optional[str] = "en"

class UserCreate(UserBase):
    name: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    language: Optional[str] = None

class UserResponse(UserBase):
    id: int
    name: str
    language: str
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"
    class Config:
        from_attributes = True

class PhotoUploadRequest(BaseModel):
    image: str
    source: str

class PhotoResponse(BaseModel):
    id: int
    filename: str
    s3_url: str
    source: str
    uploaded_at: str    
    class Config:
        from_attributes = True

class SkinAnalysisResponse(BaseModel):
    id: int
    photo_id: int
    analysis_data: dict
    skin_problems: Optional[str] = None
    recommendations: Optional[str] = None
    created_at: str
    class Config:
        from_attributes = True

class SkinAnalysisRequest(BaseModel):
    photo_id: int
