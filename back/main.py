from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import engine
import models

from auth import router as auth_router
from user import router as user_router
from photo import router as photo_router
from skin_analysis import router as skin_router
from food_analysis import router as food_router
from config import FRONT_URL
from food_routes import router as food_recommendation_router


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Sorting API")
app.add_middleware(CORSMiddleware, allow_origins=[FRONT_URL], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(photo_router, prefix="/photos", tags=["photos"])
app.include_router(skin_router, prefix="/skin-analysis", tags=["skin"])
app.include_router(food_router, prefix="/food", tags=["food"])
app.include_router(food_recommendation_router, prefix="/food", tags=["food-recommendation"])


@app.get("/")
async def root():
    return {"message": "Smart Sorting API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}





# import os
# import time
# import uuid
# import json
# import base64
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional, Tuple

# import requests
# import google.generativeai as genai
# from fastapi import FastAPI, Depends, HTTPException, status, Cookie, Response, Request, File, UploadFile
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import OAuth2PasswordBearer
# from fastapi.responses import JSONResponse
# from jose import JWTError, jwt
# from passlib.context import CryptContext
# from slowapi import Limiter
# from slowapi.errors import RateLimitExceeded
# from slowapi.util import get_remote_address
# from sqlalchemy.orm import Session

# import models
# import schemas
# import traceback
# from db import engine, get_db
# from food_detection_service import detect_foods_from_base64
# from s3_service import s3_service

# app = FastAPI(title="Smart Sorting API")

# models.Base.metadata.create_all(bind=engine)

# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = os.getenv("ALGORITHM")
# ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# from dotenv import load_dotenv
# load_dotenv()
# ZYLA_URL = os.getenv("ZYLA_URL")
# ZYLA_KEY = os.getenv("ZYLA_KEY")

# GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
# genai.configure(api_key=GEMINI_API_KEY, transport="rest")

# pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# def create_access_token(data: dict, expires_delta: timedelta = None):
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.now(timezone.utc) + expires_delta
#     else:
#         expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt

# def get_current_user_from_cookie(access_token: Optional[str] = Cookie(None), db: Session = Depends(get_db)):
#     if not access_token:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
#     try:
#         payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
#         user_id: str = payload.get("sub")
#         if user_id is None:
#             raise HTTPException(status_code=401, detail="Invalid token")
#     except JWTError:
#         raise HTTPException(status_code=401, detail="Invalid token")
    
#     user = db.query(models.User).filter(models.User.id == int(user_id)).first()
#     if user is None:
#         raise HTTPException(status_code=401, detail="User not found")
    
#     return user

# @app.exception_handler(RateLimitExceeded)
# def rate_limit_handler(request: Request, exc: RateLimitExceeded):
#     return JSONResponse(status_code=429)

# @app.get("/")
# async def root():
#     return {"message": "Smart Sorting API"}

# @app.get("/health")
# async def health_check():
#     return {"status": "healthy", "database": "connected"}

# @app.post("/users/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
# def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
#     db_user = db.query(models.User).filter(models.User.email == user.email).first()
#     if db_user:
#         raise HTTPException(status_code=400, detail="Email already registered")
    
#     hashed_password = pwd_context.hash(user.password)
    
#     db_user = models.User(
#         name=user.name,
#         email=user.email,
#         hashed_password=hashed_password,
#         language=user.language or "en"
#     )
#     db.add(db_user)
#     db.commit()
#     db.refresh(db_user)
#     return db_user

# @app.get("/users/", response_model=List[schemas.UserResponse])
# def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
#     return db.query(models.User).offset(skip).limit(limit).all()

# @app.get("/users/me", response_model=schemas.UserResponse)
# def get_current_user_info(current_user: models.User = Depends(get_current_user_from_cookie)):
#     return {
#         "id": current_user.id,
#         "email": current_user.email,
#         "name": current_user.name,
#         "language": current_user.language
#     }

# @app.post("/auth/login", response_model=schemas.TokenResponse)
# @Limiter(key_func=get_remote_address).limit("5/minute")
# def login(request: Request, credentials: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
#     user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
#     if not user or not pwd_context.verify(credentials.password, user.hashed_password):
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
#     token = create_access_token(
#         data={"sub": str(user.id), "email": user.email},
#         expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     )

#     response.set_cookie(
#         key="access_token",
#         value=token,
#         httponly=True,
#         secure=False,
#         samesite="lax",
#         max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
#     )
    
#     return {"access_token": token, "token_type": "bearer", "user": user}

# @app.post("/auth/logout")
# def logout(response: Response):
#     response.delete_cookie(key="access_token")
#     return {"message": "Logout successful"}

# @app.post("/photos/upload")
# def upload_photo(request: schemas.PhotoUploadRequest, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     try:
#         if not request.image:
#             raise HTTPException(status_code=400, detail="Image manquante")
#         if request.source not in ["capture", "import"]:
#             raise HTTPException(status_code=400, detail="Source invalide")
        
#         s3_result = s3_service.upload_image(
#             image_base64=request.image,
#             user_id=current_user.id,
#             source=request.source
#         )
        
#         db_photo = models.Photo(
#             user_id=current_user.id,
#             filename=s3_result["filename"],
#             s3_url=s3_result["s3_url"],
#             source=request.source
#         )
#         db.add(db_photo)
#         db.commit()
#         db.refresh(db_photo)
        
#         return {
#             "id": db_photo.id,
#             "filename": db_photo.filename,
#             "s3_url": db_photo.s3_url,
#             "message": "Photo uploadée avec succès"
#         }
    
#     except HTTPException:
#         db.rollback()
#         raise
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

# @app.get("/photos", response_model=list[schemas.PhotoResponse])
# def get_user_photos(skip: int = 0, limit: int = 50, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     photos = db.query(models.Photo).filter(
#         models.Photo.user_id == current_user.id
#     ).order_by(
#         models.Photo.uploaded_at.desc()
#     ).offset(skip).limit(limit).all()
    
#     return photos

# @app.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
# def delete_photo( photo_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     try:
#         photo = db.query(models.Photo).filter(
#             models.Photo.id == photo_id,
#             models.Photo.user_id == current_user.id
#         ).first()
        
#         if not photo:
#             raise HTTPException(status_code=404, detail="Photo non trouvée")
        
#         try:
#             s3_service.s3_client.delete_object(
#                 Bucket=s3_service.bucket_name,
#                 Key=photo.filename
#             )
#         except Exception as e:
#             print(f"Erreur suppression S3: {e}")
        
#         db.delete(photo)
#         db.commit()
        
#         return None
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=str(e))
    
# # @app.post("/skin-analysis/analyze/{photo_id}", response_model=schemas.SkinAnalysisResponse)
# # def analyze_skin(photo_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
# #     try:
# #         # Verify photo belongs to user
# #         photo = db.query(models.Photo).filter(
# #             models.Photo.id == photo_id,
# #             models.Photo.user_id == current_user.id
# #         ).first()
        
# #         if not photo:
# #             raise HTTPException(status_code=404, detail="Photo not found")
        
# #         # Check if analysis already exists
# #         existing_analysis = db.query(models.SkinAnalysis).filter(models.SkinAnalysis.photo_id == photo_id).first()
        
# #         if existing_analysis:
# #             return {
# #                 "id": existing_analysis.id,
# #                 "photo_id": existing_analysis.photo_id,
# #                 "analysis_data": json.loads(existing_analysis.analysis_data),
# #                 "skin_problems": existing_analysis.skin_problems,
# #                 "recommendations": existing_analysis.recommendations,
# #                 "created_at": existing_analysis.created_at.isoformat()
# #             }
        
# #         headers = {
# #             "Authorization": f"Bearer {ZYLA_KEY}",
# #             "Content-Type": "application/json"
# #         }
        
# #         # Prepare payloads - prioritize base64 data over URLs
# #         payloads = []
# #         base64_data = None
        
# #         # If we have a data URL, extract base64 and use it directly (most reliable)
# #         if photo.s3_url.startswith("data:image"):
# #             base64_data = photo.s3_url.split(",")[-1] if "," in photo.s3_url else photo.s3_url
# #             print(f"📸 Using base64 data from data URL (length: {len(base64_data)} chars)")
# #         else:
# #             try:
# #                 if ".s3." in photo.s3_url:
# #                     url_parts = photo.s3_url.split(".s3.")
# #                     if len(url_parts) > 1:
# #                         # Remove query parameters if present
# #                         path_part = url_parts[1].split("?")[0]
# #                         key = path_part.split("/", 1)[1] if "/" in path_part else path_part
# #                     else:
# #                         key = photo.filename
# #                 else:
# #                     key = photo.filename

# #                 try:
# #                     # Use boto3 to get object directly (no HTTP needed)
# #                     response = s3_service.s3_client.get_object(Bucket=s3_service.bucket_name,Key=key)
# #                     image_bytes = response['Body'].read()
# #                     base64_data = base64.b64encode(image_bytes).decode('utf-8')
# #                 except Exception as s3_error:
# #                     raise Exception(f"Cannot download image from S3: {s3_error}. Base64 data is required for API.")
# #             except Exception as e:
# #                 raise Exception(f"Cannot convert image to base64: {e}. The Zyla API requires base64 data, not URLs.")
        
# #         if not base64_data:
# #             raise HTTPException(status_code=500, detail="Cannot analyze image: Zyla API requires base64-encoded images, not URLs.")
        
# #         focus_areas = ["acne", "wrinkles", "pores", "pigmentation", "dark_circles", "oiliness"]
        
# #         # Use the S3 URL - it should be publicly accessible now
# #         # if photo.s3_url and not photo.s3_url.startswith("data:image"):
# #         #     payloads = [{ "analysis_type": "comprehensive", "image_url": photo.s3_url, "focus_areas": focus_areas }]
# #         # else:
# #         #     raise HTTPException(status_code=500, detail="Cannot analyze image: Zyla API requires publicly accessible HTTP/HTTPS URLs.")
# #         payloads = [{ "analysis_type": "comprehensive", "image_base64": base64_data, "focus_areas": focus_areas}]
        
# #         analysis_result = None
# #         last_error = None
# #         max_retries = 3
# #         base_delay = 2  
        
# #         for payload_index, payload in enumerate(payloads):
# #             if payload_index > 0:
# #                 time.sleep(3)  
            
# #             for attempt in range(max_retries):
# #                 try:
# #                     payload_keys = [k for k in payload.keys() if k not in ["analysis_type", "focus_areas"]]
# #                     payload_key = payload_keys[0] if payload_keys else "unknown"
# #                     if attempt > 0:
# #                         delay = base_delay * (2 ** (attempt - 1)) 
# #                         time.sleep(delay)
# #                     else:
# #                         print(f"🔄 Trying payload with key: {payload_key}")
                    
# #                     response = requests.post(ZYLA_URL, json=payload, headers=headers, timeout=60)
                    
# #                     if response.status_code == 503:
# #                         if attempt < max_retries - 1:
# #                             delay = base_delay * (2 ** attempt)  # 2s, 4s, 8s
# #                             time.sleep(delay)
# #                             last_error = f"503 Service Unavailable (attempt {attempt + 1}/{max_retries})"
# #                             continue
# #                         else:
# #                             last_error = "503 Service Unavailable - API is rate limiting or temporarily down"
# #                             break
                    
# #                     response.raise_for_status()
# #                     result = response.json()
                    
# #                     if isinstance(result, dict):
# #                         if result.get("error"):
# #                             error_msg = result.get("message", "Unknown error")
# #                             last_error = f"API error: {error_msg}"
# #                             break
                        
# #                         analysis_fields = ["lesions", "pores", "wrinkles", "pigmentation", "skin_type", "severity", "quality"]
# #                         has_any_data = False
# #                         for field in analysis_fields:
# #                             field_data = result.get(field, {})
# #                             if isinstance(field_data, dict) and field_data:
# #                                 if any(v for v in field_data.values() if v not in [None, "", 0, 0.0, [], {}]):
# #                                     has_any_data = True
# #                                     break
                        
# #                         if not has_any_data:
# #                             print(f"⚠️  API returned response but NO analysis data in any field!")
                    
# #                     if isinstance(result, dict) and result.get("success") is False:
# #                         last_error = f"API error: {error_msg}"
# #                         break
                    
# #                     if isinstance(result, dict):
# #                         status = result.get("status", "").lower()
# #                         if status in ["processing", "pending", "in_progress"]:
# #                             if "results" in result:
# #                                 result = result["results"]
# #                             elif "data" in result:
# #                                 result = result["data"]
# #                             else:
# #                                 last_error = "API is processing asynchronously"
# #                                 break
                        
# #                         has_data = False
# #                         analysis_keys = ["lesions", "pores", "wrinkles", "pigmentation", "skin_type", "severity", "quality"]
                        
# #                         for key in analysis_keys:
# #                             if key in result and result[key]:
# #                                 has_data = True
# #                                 print(f"✅ Found analysis data in field: {key}")
# #                                 break
                        
# #                         # Also check nested structures
# #                         if not has_data and "severity" in result:
# #                             severity = result.get("severity", {})
# #                             if isinstance(severity, dict) and (severity.get("overall") or severity.get("total_weighted_score", 0) > 0):
# #                                 has_data = True
# #                                 print(f"✅ Found analysis data in severity field")
                        
# #                         if has_data:
# #                             analysis_result = result
# #                             break  #
# #                         else:
# #                             metadata_keys = ["log_id", "request_id", "timestamp", "analysis_type", "image_url"]
# #                             has_metadata = all(key in result for key in metadata_keys[:3])
                            
# #                             all_empty = True
# #                             for key in analysis_keys:
# #                                 field_data = result.get(key, {})
# #                                 if isinstance(field_data, dict) and field_data:
# #                                     if any(v for v in field_data.values() if v not in [None, "", 0, 0.0, [], {}, "unknown"]):
# #                                         all_empty = False
# #                                         break
                            
# #                             if has_metadata and all_empty:
# #                                 last_error = f"API received image but returned empty analysis (tried payload: {payload_key})"
# #                                 break
# #                             else:
# #                                 last_error = "API returned empty or invalid analysis data"
# #                                 break 
# #                     else:
# #                         analysis_result = result
# #                         break
                    
# #                 except requests.exceptions.HTTPError as e:
# #                     if e.response.status_code == 503 and attempt < max_retries - 1:
# #                         continue
# #                     last_error = str(e)
# #                     break 
# #                 except requests.exceptions.RequestException as e:
# #                     last_error = str(e)
# #                     break
        
# #             if analysis_result is not None:
# #                 break
        
# #         if analysis_result is None:
# #             raise HTTPException(status_code=500, detail=f"Error calling skin analysis API: {last_error}. Tried {len(payloads)} different payload formats.")
        
# #         if isinstance(analysis_result, dict):
# #             if "severity" in analysis_result:
# #                 print(f"📊 Severity data: {analysis_result.get('severity')}")
# #             if "quality" in analysis_result:
# #                 print(f"📊 Quality data: {analysis_result.get('quality')}")
# #             if "lesions" in analysis_result:
# #                 print(f"📊 Lesions data: {analysis_result.get('lesions')}")
# #             if "pores" in analysis_result:
# #                 print(f"📊 Pores data: {analysis_result.get('pores')}")
# #             if "wrinkles" in analysis_result:
# #                 print(f"📊 Wrinkles data: {analysis_result.get('wrinkles')}")
# #             if "pigmentation" in analysis_result:
# #                 print(f"📊 Pigmentation data: {analysis_result.get('pigmentation')}")
        
# #         skin_problems = []
# #         recommendations = []
        
# #         if isinstance(analysis_result, dict):
# #             problems_found = []

# #             # Extract lesions with detailed metrics (acne/blemishes)
# #             lesions = analysis_result.get("lesions", {})
# #             print(f"🔍 Lesions data: {lesions}")
# #             if isinstance(lesions, dict) and lesions.get("count", 0) > 0:
# #                 count = lesions.get("count", 0)
# #                 severity = lesions.get("severity", "detected")
# #                 severity_pct = lesions.get("severity_percentage", 0)
# #                 problems_found.append(f"Lesions: {count} detected ({severity} severity, {severity_pct*100:.1f}% affected area)")
            
# #             # Extract pores with regional breakdown
# #             pores = analysis_result.get("pores", {})
# #             print(f"🔍 Pores data: {pores}")
# #             if isinstance(pores, dict):
# #                 total_pores = 0
# #                 max_severity = "low"
# #                 pore_details = []
# #                 for region, region_data in pores.items():
# #                     if isinstance(region_data, dict):
# #                         count = region_data.get("count", 0)
# #                         severity = region_data.get("severity", "low")
# #                         density = region_data.get("density", 0)
# #                         total_pores += count
# #                         if severity in ["moderate", "severe"]:
# #                             max_severity = severity
# #                         if count > 0:
# #                             pore_details.append(f"{region}: {count} ({density:.2f}/10k pixels, {severity})")
# #                 if total_pores > 0:
# #                     problems_found.append(f"Pores: {total_pores} total ({max_severity} severity)")
# #                     if pore_details:
# #                         problems_found.append(f"  Regional: {', '.join(pore_details)}")
            
# #             # Extract wrinkles with regional scores
# #             wrinkles = analysis_result.get("wrinkles", {})
# #             print(f"🔍 Wrinkles data: {wrinkles}")
# #             if isinstance(wrinkles, dict):
# #                 wrinkle_details = []
# #                 max_wrinkle_severity = "none"
# #                 for region, region_data in wrinkles.items():
# #                     if isinstance(region_data, dict):
# #                         severity = region_data.get("severity", "none")
# #                         score = region_data.get("wrinkle_score", 0)
# #                         if severity != "none":
# #                             wrinkle_details.append(f"{region}: {severity} (score: {score:.2f})")
# #                             if severity in ["moderate", "severe"]:
# #                                 max_wrinkle_severity = severity
# #                 if max_wrinkle_severity != "none":
# #                     problems_found.append(f"Wrinkles: {max_wrinkle_severity} severity detected")
# #                     if wrinkle_details:
# #                         problems_found.append(f"  Regional: {', '.join(wrinkle_details)}")
            
# #             # Extract pigmentation with regional breakdown (dark spots)
# #             pigmentation = analysis_result.get("pigmentation", {})
# #             print(f"🔍 Pigmentation data: {pigmentation}")
# #             if isinstance(pigmentation, dict):
# #                 total_spots = 0
# #                 pig_details = []
# #                 for region, region_data in pigmentation.items():
# #                     if isinstance(region_data, dict):
# #                         spots = region_data.get("spot_count", 0)
# #                         density = region_data.get("density", 0)
# #                         total_spots += spots
# #                         if spots > 0:
# #                             pig_details.append(f"{region}: {spots} spots ({density:.2f}/10k pixels)")
# #                 if total_spots > 0:
# #                     problems_found.append(f"Pigmentation: {total_spots} spots detected")
# #                     if pig_details:
# #                         problems_found.append(f"  Regional: {', '.join(pig_details)}")
            
# #             # Get skin type with confidence
# #             skin_type_info = analysis_result.get("skin_type", {})
# #             if isinstance(skin_type_info, dict):
# #                 skin_type_label = skin_type_info.get("label", "")
# #                 confidence = skin_type_info.get("confidence", 0)
# #                 if skin_type_label:
# #                     problems_found.append(f"Skin Type: {skin_type_label} (confidence: {confidence*100:.1f}%)")
            
# #             # Get overall severity with component scores
# #             severity_info = analysis_result.get("severity", {})
# #             if isinstance(severity_info, dict):
# #                 overall_severity = severity_info.get("overall", "")
# #                 weighted_score = severity_info.get("total_weighted_score", 0)
# #                 confidence = severity_info.get("confidence", 0)
# #                 # Only add if we have meaningful data
# #                 if overall_severity and overall_severity != "unknown" and overall_severity != "":
# #                     if weighted_score > 0 or confidence > 0:
# #                         problems_found.append(f"Overall Severity: {overall_severity} (weighted score: {weighted_score:.2f}, confidence: {confidence*100:.1f}%)")
# #                     else:
# #                         problems_found.append(f"Overall Severity: {overall_severity}")
# #                 elif weighted_score > 0:
# #                     problems_found.append(f"Overall Severity: detected (weighted score: {weighted_score:.2f})")
            
# #             # Quality assessment
# #             quality_info = analysis_result.get("quality", {})
# #             if isinstance(quality_info, dict):
# #                 quality_level = quality_info.get("overall_quality", "")
# #                 quality_score = quality_info.get("quality_score", 0)
# #                 # Only add if we have meaningful data
# #                 if quality_level and quality_level != "error" and quality_level != "":
# #                     if quality_score > 0:
# #                         problems_found.append(f"Image Quality: {quality_level} (score: {quality_score*100:.1f}%)")
# #                     else:
# #                         problems_found.append(f"Image Quality: {quality_level}")
# #                 elif quality_score > 0:
# #                     problems_found.append(f"Image Quality: acceptable (score: {quality_score*100:.1f}%)")
            
# #             # Also check for other common skin problem indicators
# #             # Check for oiliness/shine
# #             if "oiliness" in analysis_result or "shine" in analysis_result:
# #                 oiliness = analysis_result.get("oiliness") or analysis_result.get("shine")
# #                 if isinstance(oiliness, dict) and oiliness.get("level"):
# #                     problems_found.append(f"Oiliness: {oiliness.get('level')} level detected")
# #                 elif isinstance(oiliness, (int, float)) and oiliness > 0:
# #                     problems_found.append(f"Oiliness: {oiliness}% detected")
            
# #             # Check for dark circles
# #             if "dark_circles" in analysis_result or "dark_circles_score" in analysis_result:
# #                 dark_circles = analysis_result.get("dark_circles") or analysis_result.get("dark_circles_score")
# #                 if isinstance(dark_circles, dict) and dark_circles.get("severity"):
# #                     problems_found.append(f"Dark Circles: {dark_circles.get('severity')} severity")
# #                 elif isinstance(dark_circles, (int, float)) and dark_circles > 0:
# #                     problems_found.append(f"Dark Circles: {dark_circles}% detected")
            
# #             # Check for texture issues
# #             if "texture" in analysis_result:
# #                 texture = analysis_result.get("texture")
# #                 if isinstance(texture, dict) and texture.get("score", 0) > 0:
# #                     problems_found.append(f"Texture Issues: score {texture.get('score')}")
            
# #             skin_problems = problems_found if problems_found else ["No major issues detected"]
            
# #             print(f"📋 Extracted {len(skin_problems)} skin problems: {skin_problems}")
# #             if len(skin_problems) == 1 and skin_problems[0] == "No major issues detected":
# #                 print(f"⚠️  Full response structure: {json.dumps(analysis_result, indent=2)[:2000]}")
            
# #             # Generate comprehensive recommendations based on all detected issues
# #             if isinstance(wrinkles, dict) and any(
# #                 isinstance(v, dict) and v.get("severity") in ["moderate", "severe"]
# #                 for v in wrinkles.values()
# #             ):
# #                 recommendations.extend(["Vitamin C", "Collagen", "Retinol", "Vitamin E", "Peptides"])
            
# #             if (isinstance(lesions, dict) and lesions.get("count", 0) > 0) or \
# #                (isinstance(pores, dict) and any(
# #                    isinstance(v, dict) and v.get("count", 0) > 0
# #                    for v in pores.values()
# #                )):
# #                 recommendations.extend(["Vitamin A", "Zinc", "Salicylic Acid", "Niacinamide", "Tea Tree Oil"])
            
# #             if isinstance(pigmentation, dict) and any(
# #                 isinstance(v, dict) and v.get("spot_count", 0) > 0
# #                 for v in pigmentation.values()
# #             ):
# #                 recommendations.extend(["Vitamin C", "Niacinamide", "Vitamin E", "Retinol", "Alpha Arbutin"])
            
# #             # Check skin type for additional recommendations
# #             if isinstance(skin_type_info, dict):
# #                 skin_type_label = skin_type_info.get("label", "").lower()
# #                 if "dry" in skin_type_label:
# #                     recommendations.extend(["Hyaluronic Acid", "Ceramides", "Omega-3"])
# #                 elif "oily" in skin_type_label:
# #                     recommendations.extend(["Niacinamide", "Salicylic Acid", "Clay"])
            
# #             # Remove duplicates
# #             recommendations = list(dict.fromkeys(recommendations))
            
# #             if not recommendations:
# #                 recommendations = ["Vitamin C", "Vitamin E", "Omega-3", "Hyaluronic Acid", "Antioxidants"]  # General skin health
        
# #         # Ensure we always have at least one problem entry
# #         if not skin_problems:
# #             skin_problems = ["Analysis completed - check detailed results"]
        
# #         # Store analysis in database
# #         skin_problems_str = json.dumps(skin_problems) if isinstance(skin_problems, (list, dict)) else str(skin_problems)
# #         recommendations_str = json.dumps(recommendations) if isinstance(recommendations, (list, dict)) else str(recommendations)
# #         db_analysis = models.SkinAnalysis(
# #             user_id=current_user.id,
# #             photo_id=photo_id,
# #             analysis_data=json.dumps(analysis_result),
# #             skin_problems=skin_problems_str,
# #             recommendations=recommendations_str
# #         )
# #         db.add(db_analysis)
# #         db.commit()
# #         db.refresh(db_analysis)
        
# #         response_data = {
# #             "id": db_analysis.id,
# #             "photo_id": db_analysis.photo_id,
# #             "analysis_data": analysis_result,
# #             "skin_problems": skin_problems_str,
# #             "recommendations": recommendations_str,
# #             "created_at": db_analysis.created_at.isoformat()
# #         }

# #         return response_data
    
# #     except HTTPException:
# #         db.rollback()
# #         raise
# #     except Exception as e:
# #         db.rollback()
# #         raise HTTPException(status_code=500, detail=f"Error analyzing skin: {str(e)}")

# @app.post("/skin-analysis/analyze/{photo_id}", response_model=schemas.SkinAnalysisResponse)
# def analyze_skin(
#     photo_id: int, 
#     current_user: models.User = Depends(get_current_user_from_cookie), 
#     db: Session = Depends(get_db)
# ):
#     try:
#         # 1️⃣ Récupérer la photo
#         photo = db.query(models.Photo).filter(
#             models.Photo.id == photo_id,
#             models.Photo.user_id == current_user.id
#         ).first()
        
#         if not photo:
#             raise HTTPException(status_code=404, detail="Photo not found")
        
#         # 2️⃣ Vérifier si analyse existe déjà
#         existing = db.query(models.SkinAnalysis).filter(
#             models.SkinAnalysis.photo_id == photo_id
#         ).first()
        
#         if existing:
#             return {
#                 "id": existing.id,
#                 "photo_id": existing.photo_id,
#                 "analysis_data": json.loads(existing.analysis_data),
#                 "skin_problems": existing.skin_problems,
#                 "recommendations": existing.recommendations,
#                 "created_at": existing.created_at.isoformat()
#             }
        
#         # 3️⃣ Extraire le base64 de l'image
#         print(f"📸 Extracting image for photo_id={photo_id}")
        
#         if photo.s3_url.startswith("data:image"):
#             # Image stockée en base64 (mode test)
#             base64_data = photo.s3_url.split(",")[-1] if "," in photo.s3_url else photo.s3_url
#             print(f"✅ Using base64 from data URL (length: {len(base64_data)})")
#         else:
#             # Image sur S3
#             try:
#                 # Extraire la clé S3
#                 if ".s3." in photo.s3_url:
#                     path_part = photo.s3_url.split(".s3.")[-1].split("?")[0]
#                     key = path_part.split("/", 1)[-1] if "/" in path_part else photo.filename
#                 else:
#                     key = photo.filename
                
#                 print(f"📥 Downloading from S3: {key}")
                
#                 # Télécharger depuis S3
#                 s3_response = s3_service.s3_client.get_object(
#                     Bucket=s3_service.bucket_name,
#                     Key=key
#                 )
#                 image_bytes = s3_response['Body'].read()
#                 base64_data = base64.b64encode(image_bytes).decode('utf-8')
                
#                 print(f"✅ Downloaded from S3 (size: {len(image_bytes)} bytes)")
            
#             except Exception as s3_error:
#                 print(f"❌ S3 error: {s3_error}")
#                 raise HTTPException(
#                     status_code=500, 
#                     detail=f"Cannot download image from S3: {str(s3_error)}"
#                 )
        
#         # 4️⃣ Appeler l'API Zyla
#         print(f"📤 Calling Zyla API...")
        
#         headers = {
#             "Authorization": f"Bearer {ZYLA_KEY}",
#             "Content-Type": "application/json"
#         }
        
#         # Essayer différents formats de payload
#         payloads_to_try = [
#             {"image_base64": base64_data},  # Format simple
#             {"image": base64_data},  # Format alternatif
#             {
#                 "image_base64": base64_data,
#                 "analysis_type": "comprehensive"
#             }
#         ]
        
#         analysis_result = None
#         last_error = None
        
#         for i, payload in enumerate(payloads_to_try):
#             try:
#                 print(f"🔄 Trying payload format {i+1}/{len(payloads_to_try)}: {list(payload.keys())}")
                
#                 response = requests.post(
#                     ZYLA_URL, 
#                     json=payload, 
#                     headers=headers, 
#                     timeout=60
#                 )
                
#                 print(f"📥 Response status: {response.status_code}")
#                 print(f"📥 Response preview: {response.text[:300]}")
                
#                 result = response.json()
                
#                 # Vérifier si l'API a retourné un succès
#                 if result.get("success") is True:
#                     print(f"✅ Payload format {i+1} worked!")
#                     analysis_result = result.get("response", result)
#                     break
                
#                 # Si échec, logger et essayer le suivant
#                 if result.get("success") is False:
#                     error_msg = result.get("message", "Unknown error")
#                     print(f"⚠️  API returned error: {error_msg}")
#                     last_error = error_msg
                    
#                     # Si c'est une erreur de format, essayer le suivant
#                     if i < len(payloads_to_try) - 1:
#                         continue
                
#                 # Si status code != 200, essayer le suivant
#                 if response.status_code != 200:
#                     last_error = f"HTTP {response.status_code}: {response.text[:200]}"
#                     if i < len(payloads_to_try) - 1:
#                         continue
                    
#             except Exception as e:
#                 print(f"❌ Error with payload {i+1}: {str(e)}")
#                 last_error = str(e)
#                 if i < len(payloads_to_try) - 1:
#                     continue
        
#         # Si aucun format n'a fonctionné
#         if analysis_result is None:
#             raise HTTPException(
#                 status_code=502,
#                 detail=f"Zyla API error: {last_error}"
#             )
        
#         # 5️⃣ Parser les résultats (version simplifiée)
#         print(f"📊 Parsing analysis results...")
        
#         skin_problems = ["Analysis completed successfully"]
#         recommendations = ["Vitamin C", "Hyaluronic Acid", "Retinol"]
        
#         # Essayer d'extraire des données réelles si disponibles
#         if isinstance(analysis_result, dict):
#             problems_temp = []
            
#             # Lesions/Acne
#             if "lesions" in analysis_result or "acne" in analysis_result:
#                 lesions = analysis_result.get("lesions") or analysis_result.get("acne")
#                 if isinstance(lesions, dict):
#                     count = lesions.get("count", 0)
#                     if count > 0:
#                         problems_temp.append(f"Acne: {count} spots detected")
#                         recommendations.extend(["Salicylic Acid", "Niacinamide"])
            
#             # Wrinkles
#             if "wrinkles" in analysis_result:
#                 wrinkles = analysis_result.get("wrinkles", {})
#                 if isinstance(wrinkles, dict) and wrinkles:
#                     problems_temp.append("Wrinkles detected")
#                     recommendations.extend(["Retinol", "Peptides"])
            
#             # Skin type
#             if "skin_type" in analysis_result:
#                 skin_type = analysis_result.get("skin_type", {})
#                 if isinstance(skin_type, dict):
#                     label = skin_type.get("label", "")
#                     if label:
#                         problems_temp.append(f"Skin Type: {label}")
            
#             # Si on a trouvé des problèmes, les utiliser
#             if problems_temp:
#                 skin_problems = problems_temp
        
#         # Supprimer les doublons dans les recommandations
#         recommendations = list(dict.fromkeys(recommendations))
        
#         print(f"📋 Problems: {skin_problems}")
#         print(f"💊 Recommendations: {recommendations}")
        
#         # 6️⃣ Sauvegarder en base de données
#         db_analysis = models.SkinAnalysis(
#             user_id=current_user.id,
#             photo_id=photo_id,
#             analysis_data=json.dumps(analysis_result),
#             skin_problems=json.dumps(skin_problems),
#             recommendations=json.dumps(recommendations)
#         )
        
#         db.add(db_analysis)
#         db.commit()
#         db.refresh(db_analysis)
        
#         print(f"✅ Analysis saved with id={db_analysis.id}")
        
#         # 7️⃣ Retourner la réponse
#         return {
#             "id": db_analysis.id,
#             "photo_id": db_analysis.photo_id,
#             "analysis_data": analysis_result,
#             "skin_problems": json.dumps(skin_problems),
#             "recommendations": json.dumps(recommendations),
#             "created_at": db_analysis.created_at.isoformat()
#         }
    
#     except HTTPException:
#         db.rollback()
#         raise
    
#     except Exception as e:
#         db.rollback()
#         print(f"❌ Unexpected error: {str(e)}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Error analyzing skin: {str(e)}")
    

# @app.get("/skin-analysis/history", response_model=List[schemas.SkinAnalysisResponse])
# def get_skin_analysis_history(skip: int = 0, limit: int = 50, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     analyses = db.query(models.SkinAnalysis).filter(models.SkinAnalysis.user_id == current_user.id).order_by(models.SkinAnalysis.created_at.desc()).offset(skip).limit(limit).all()
    
#     result = []
#     for analysis in analyses:
#         result.append({
#             "id": analysis.id,
#             "photo_id": analysis.photo_id,
#             "analysis_data": json.loads(analysis.analysis_data),
#             "skin_problems": analysis.skin_problems,
#             "recommendations": analysis.recommendations,
#             "created_at": analysis.created_at.isoformat()
#         })
    
#     return result

# @app.get("/skin-analysis/{analysis_id}", response_model=schemas.SkinAnalysisResponse)
# def get_skin_analysis(analysis_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     analysis = db.query(models.SkinAnalysis).filter(models.SkinAnalysis.id == analysis_id, models.SkinAnalysis.user_id == current_user.id).first()

#     if not analysis:
#         raise HTTPException(status_code=404, detail="Analysis not found")
    
#     return {
#         "id": analysis.id,
#         "photo_id": analysis.photo_id,
#         "analysis_data": json.loads(analysis.analysis_data),
#         "skin_problems": analysis.skin_problems,
#         "recommendations": analysis.recommendations,
#         "created_at": analysis.created_at.isoformat()
#     }

# def fetch_nutrition_from_gemini(food_name: str):
#     try:
#         model = genai.GenerativeModel("gemini-2.0-flash")

#         prompt = f"""
#         Provide nutrition data in JSON format for: {food_name}
#         Only return JSON, no explanation. Include:
#         - calories
#         - protein_g
#         - carbs_g
#         - fiber_g
#         - sugar_g
#         - fat_g
#         - vitamins (C, A, K)
#         - minerals (iron, potassium, magnesium)
#         """

#         response = model.generate_content(prompt)

#         text = response.text.strip()
#         if text.startswith("```"):
#             text = text.replace("```json", "").replace("```", "").strip()

#         import json
#         return json.loads(text)

#     except Exception as e:
#         print("Nutrition GPT error:", str(e))
#         return None

# @app.post("/food/analyze", summary="Upload image → Detect food → Save")
# async def analyze_food(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     image_bytes = await file.read()

#     if not image_bytes:
#         raise HTTPException(status_code=400, detail="No file received")

#     filename = f"local_{uuid.uuid4()}.jpg"
#     s3_url = None

#     try:
#         upload_result = s3_service.upload_image(
#             image_base64=base64.b64encode(image_bytes).decode(),
#             user_id=current_user.id,
#             source="food"
#         )
#         filename = upload_result.get("filename", filename)
#         s3_url = upload_result.get("s3_url", None)

#     except Exception as e:
#         print("AWS failed, saving locally only:", e)

#     photo = models.Photo(user_id=current_user.id, filename=filename, s3_url=s3_url, source="food")
#     db.add(photo)
#     db.flush()

#     detections = detect_foods_from_base64(base64.b64encode(image_bytes).decode())

#     saved_items = []

#     for detected in detections:
#         nutrition = fetch_nutrition_from_gemini(detected["name"])

#     item = models.FoodItem(
#         user_id=current_user.id,
#         photo_id=photo.id,
#         name=detected["name"],
#         confidence=detected["confidence"],
#         nutrition_json=nutrition 
#     )

#     db.add(item)
#     saved_items.append(item)
#     db.commit()

#     return {
#         "aws": "success" if s3_url else "skipped",
#         "photo_id": photo.id,
#         "items": [
#             {"id": i.id, "name": i.name, "confidence": i.confidence}
#             for i in saved_items
#         ]
#     }

# @app.get("/inventory")
# def get_inventory(current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     items = db.query(models.FoodItem).filter(models.FoodItem.user_id == current_user.id).order_by(models.FoodItem.created_at.desc()).all()
#     return [{
#             "id": item.id,
#             "name": item.name,
#             "confidence": item.confidence,
#             "photo_id": item.photo_id,
#             "created_at": item.created_at.isoformat(),
#             "nutrition": item.nutrition_json
#         }
#         for item in items
#     ]

# @app.get("/inventory/{item_id}/nutrition")
# def get_item_nutrition(item_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     item = db.query(models.FoodItem).filter(
#         models.FoodItem.id == item_id,
#         models.FoodItem.user_id == current_user.id
#     ).first()

#     if not item:
#         raise HTTPException(status_code=404, detail="Item not found")

#     return {
#         "food": item.name,
#         "nutrition": item.nutrition_json or "No nutrition data available"
#     }


