import json
import google.generativeai as genai
import os
from config import GOOGLE_API_KEY

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY, transport="rest")


class FoodRecommendationService:

    @staticmethod
    def build_prompt(skin_nutrients: list, food_inventory: list):
        """
        skin_nutrients: list of needed nutrients e.g. ["Vitamin A", "Zinc", "Omega-3"]
        food_inventory: list of dictionaries containing name + nutrition_json
        """

        inventory_json = json.dumps(food_inventory, indent=2)

        return f"""
You are an expert skincare nutrition assistant.

USER SKIN NEEDS:
{skin_nutrients}

AVAILABLE FOOD (JSON format):
{inventory_json}

TASK:
1. Rank foods from the inventory based on how well their nutrition matches the skin needs.
2. For each recommended food, include:
   - name
   - score (0–10)
   - relevant nutrients
   - short reason how it helps skin

3. Then create ONE realistic meal suggestion using ONLY available foods.

OUTPUT FORMAT (strict, valid JSON):

{{
  "ranked_items": [
    {{
      "food": "string",
      "score": float,
      "reason": "string",
      "nutrients_matched": ["Vitamin A", "Omega-3"]
    }}
  ],
  "meal_suggestion": {{
    "name": "string",
    "ingredients": ["food1", "food2"],
    "benefit": "string"
  }}
}}

Return ONLY JSON. No markdown, explanation, or text outside JSON.
        """

    @staticmethod
    def generate_recommendation(skin_nutrients: list, food_inventory: list):
        prompt = FoodRecommendationService.build_prompt(skin_nutrients, food_inventory)

        model = genai.GenerativeModel("gemini-2.0-flash")

        response = model.generate_content(prompt)

        text = response.text.strip()

        # Remove formatting if Gemini wraps response
        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(text)
        except Exception:
            return {"error": "Gemini returned invalid JSON", "raw": text}
