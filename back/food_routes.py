from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from auth import get_current_user_from_cookie
from db import get_db
from models import FoodItem, SkinAnalysis
from food_recommendation_service import FoodRecommendationService

router = APIRouter()


@router.post("/recommend", summary="Generate food recommendations based on skin + inventory")
def recommend_food(
    analysis_id: int,
    current_user=Depends(get_current_user_from_cookie),
    db: Session = Depends(get_db)
):
    # 1. Load skin analysis
    analysis = db.query(SkinAnalysis).filter(
        SkinAnalysis.id == analysis_id,
        SkinAnalysis.user_id == current_user.id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Skin analysis not found")

    try:
        skin_nutrients = json.loads(analysis.recommendations)  # this contains nutrient list
    except:
        skin_nutrients = str(analysis.recommendations).strip("[]").split(",")

    # 2. Load user inventory
    items = db.query(FoodItem).filter(
        FoodItem.user_id == current_user.id
    ).all()

    if not items:
        return {"message": "No food items available", "recommendations": []}

    # Format for model
    inventory_payload = [
        {
            "name": item.name,
            "nutrition": item.nutrition_json
        }
        for item in items if item.nutrition_json
    ]

    # 3. Call Gemini service
    result = FoodRecommendationService.generate_recommendation(
        skin_nutrients=skin_nutrients,
        food_inventory=inventory_payload
    )

    # 4. Optional: Save result to DB later if you want history
    return {
        "skin_deficiencies": skin_nutrients,
        "inventory_items": len(inventory_payload),
        "recommendation": result
    }
