from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import uuid
import base64
import json
import cv2
import numpy as np
from ultralytics import YOLO
import google.generativeai as genai

import models
import schemas
from db import get_db
from auth import get_current_user_from_cookie
from photo import upload_to_s3
from config import GOOGLE_API_KEY, YOLO_MODEL_PATH

router = APIRouter()

yolo_model = YOLO(YOLO_MODEL_PATH)

genai.configure(api_key=GOOGLE_API_KEY, transport="rest")

def decode_base64_image(data_url: str) -> np.ndarray:
    if "," in data_url:
        _, b64_data = data_url.split(",", 1)
    else:
        b64_data = data_url

    img_bytes = base64.b64decode(b64_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image")
    
    return img

def detect_foods_from_base64(data_url: str) -> List[dict]:
    try:
        img = decode_base64_image(data_url)
        results = yolo_model(img)
        
        if not results:
            return []

        result = results[0]
        names = result.names

        detections = []
        
        if result.boxes is None:
            return []

        for box in result.boxes:
            cls_id = int(box.cls)
            conf = float(box.conf)
            label = names.get(cls_id, str(cls_id))
            
            detections.append({ "name": label, "confidence": round(conf, 3) })

        return detections
    
    except Exception as e:
        print(f"❌ YOLO detection error: {str(e)}")
        return []

def fetch_nutrition_from_gemini(food_name: str) -> dict:
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""
        Provide detailed nutrition data in JSON format for: {food_name}
        
        Return ONLY valid JSON (no markdown, no explanation).
        
        Include these fields:
        - calories (kcal per 100g)
        - protein_g (grams per 100g)
        - carbs_g (grams per 100g)
        - fiber_g (grams per 100g)
        - sugar_g (grams per 100g)
        - fat_g (grams per 100g)
        - vitamins (object with C, A, K in mg/mcg)
        - minerals (object with iron, potassium, magnesium in mg)
        
        Example format:
        {{
            "calories": 52,
            "protein_g": 0.3,
            "carbs_g": 14,
            "fiber_g": 2.4,
            "sugar_g": 10,
            "fat_g": 0.2,
            "vitamins": {{"C": 4.6, "A": 54, "K": 2.2}},
            "minerals": {{"iron": 0.12, "potassium": 107, "magnesium": 5}}
        }}
        """

        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        nutrition_data = json.loads(text)
        return nutrition_data

    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error for {food_name}: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Gemini API error for {food_name}: {str(e)}")
        return None

@router.post("/analyze", summary="Upload image → Detect food → Save to inventory")
async def analyze_food( file: UploadFile = File(...), current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    try:
        image_bytes = await file.read()
        
        if not image_bytes:
            raise HTTPException(status_code=400, detail="No file received")
        
        image_base64 = base64.b64encode(image_bytes).decode()
        
        filename = f"food_{uuid.uuid4()}.jpg"
        s3_url = None
        
        try:
            upload_result = upload_to_s3(
                image_base64=image_base64,
                user_id=current_user.id,
                source="food"
            )
            filename = upload_result.get("filename", filename)
            s3_url = upload_result.get("s3_url")
        
        except Exception as e:
            print(f"⚠️  S3 upload failed, saving locally only: {e}")
        
        photo = models.Photo(
            user_id=current_user.id,
            filename=filename,
            s3_url=s3_url,
            source="food"
        )
        db.add(photo)
        db.flush()
        
        detections = detect_foods_from_base64(f"data:image/jpeg;base64,{image_base64}")
        
        if not detections:
            db.commit()
            return {
                "aws": "success" if s3_url else "skipped",
                "photo_id": photo.id,
                "items": [],
                "message": "No food detected in image"
            }
        
        
        saved_items = []

        for detected in detections:
            nutrition = fetch_nutrition_from_gemini(detected["name"])
            item = models.FoodItem(
                user_id=current_user.id,
                photo_id=photo.id,
                name=detected["name"],
                confidence=detected["confidence"],
                nutrition_json=nutrition
            )
            
            db.add(item)
            saved_items.append(item)
            print(f"✅ Saved: {detected['name']} (confidence: {detected['confidence']})")
        
        db.commit()
        
        return {
            "aws": "success" if s3_url else "skipped",
            "photo_id": photo.id,
            "items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "confidence": item.confidence,
                    "nutrition": item.nutrition_json
                }
                for item in saved_items
            ]
        }
    
    except HTTPException:
        db.rollback()
        raise
    
    except Exception as e:
        db.rollback()
        print(f"❌ Error analyzing food: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing food: {str(e)}")

@router.get("/inventory", summary="Get user's food inventory")
def get_inventory(current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    items = db.query(models.FoodItem).filter(
        models.FoodItem.user_id == current_user.id
    ).order_by(
        models.FoodItem.created_at.desc()
    ).all()
    
    return [
        {
            "id": item.id,
            "name": item.name,
            "confidence": item.confidence,
            "photo_id": item.photo_id,
            "created_at": item.created_at.isoformat(),
            "nutrition": item.nutrition_json
        }
        for item in items
    ]

@router.get("/inventory/{item_id}/nutrition", summary="Get nutrition for specific item")
def get_item_nutrition(item_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    item = db.query(models.FoodItem).filter(
        models.FoodItem.id == item_id,
        models.FoodItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return {
        "food": item.name,
        "nutrition": item.nutrition_json or "No nutrition data available"
    }

@router.delete("/inventory/{item_id}", status_code=204, summary="Delete food item from inventory")
def delete_food_item(item_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    item = db.query(models.FoodItem).filter(
        models.FoodItem.id == item_id,
        models.FoodItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    
    return None
