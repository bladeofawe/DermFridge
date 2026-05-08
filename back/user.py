from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

import models, schemas
from db import get_db
from auth import get_current_user_from_cookie, pwd_context, create_access_token
from config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

@router.post("/", response_model=schemas.UserResponse, status_code=201)
def create_user(user: schemas.UserCreate, response: Response, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=pwd_context.hash(user.password),
        language=user.language or "en"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Automatically log in the user after signup
    token = create_access_token(
        data={"sub": str(db_user.id), "email": db_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return db_user

@router.get("/", response_model=List[schemas.UserResponse])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.User).offset(skip).limit(limit).all()

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_from_cookie_info(current_user: models.User = Depends(get_current_user_from_cookie)):
    return current_user