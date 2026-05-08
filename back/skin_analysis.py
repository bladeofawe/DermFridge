from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import requests
import base64
import json
import time
from datetime import datetime

import models
import schemas
from db import get_db
from auth import get_current_user_from_cookie
from photo import s3_client
from config import ZYLA_URL, ZYLA_KEY, AWS_S3_BUCKET, AWS_S3_REGION

router = APIRouter()

MAX_RETRIES = 3
BASE_RETRY_DELAY = 2  # seconds
FOCUS_AREAS = [
    "acne",
    "wrinkles",
    "pores",
    "pigmentation",
    "dark_circles",
    "oiliness"
]

def extract_base64_from_photo(photo: models.Photo) -> str:
    # Case 1: Data URL (stored directly as base64)
    if photo.s3_url.startswith("data:image"):
        base64_data = photo.s3_url.split(",")[-1] if "," in photo.s3_url else photo.s3_url
        return base64_data
    
    # Case 2: S3 URL - download and convert
    try:
        # Extract S3 key from URL
        if ".s3." in photo.s3_url:
            path_part = photo.s3_url.split(".s3.")[-1].split("?")[0]
            key = path_part.split("/", 1)[-1] if "/" in path_part else photo.filename
        else:
            key = photo.filename
        
        # Download from S3
        s3_response = s3_client.get_object(
            Bucket=AWS_S3_BUCKET,
            Key=key
        )
        image_bytes = s3_response['Body'].read()
        base64_data = base64.b64encode(image_bytes).decode('utf-8')
        
        return base64_data
    
    except Exception as s3_error:
        print(f"❌ S3 error: {s3_error}")
        raise Exception(f"Cannot download image from S3: {str(s3_error)}")

def get_image_url_from_photo(photo: models.Photo) -> str:
    """Get a publicly accessible URL for the image using presigned URL"""
    # If it's a data URL, upload to S3 first to get a public URL
    if photo.s3_url.startswith("data:image"):
        try:
            # Extract base64 data
            if "," in photo.s3_url:
                base64_data = photo.s3_url.split(",")[1]
            else:
                base64_data = photo.s3_url
            
            # Decode and upload to S3
            image_data = base64.b64decode(base64_data)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S%f")[:-3]
            filename = f"photos/{photo.user_id}/api_{timestamp}.jpg"
            
            s3_client.put_object(
                Bucket=AWS_S3_BUCKET,
                Key=filename,
                Body=image_data,
                ContentType="image/jpeg",
                ServerSideEncryption="AES256"
            )
            
            # Generate presigned URL (valid for 1 hour)
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': AWS_S3_BUCKET, 'Key': filename},
                ExpiresIn=3600
            )
            print(f"✅ Uploaded data URL to S3 and generated presigned URL")
            return presigned_url
        except Exception as e:
            raise Exception(f"Cannot upload data URL to S3 for API: {str(e)}")
    
    # Extract S3 key from URL or use filename
    if photo.s3_url and (photo.s3_url.startswith("http://") or photo.s3_url.startswith("https://")):
        # Extract key from S3 URL
        if ".s3." in photo.s3_url:
            path_part = photo.s3_url.split(".s3.")[-1].split("?")[0]
            key = path_part.split("/", 1)[-1] if "/" in path_part else photo.filename
        else:
            key = photo.filename
    else:
        key = photo.filename
    
    # Generate presigned URL (valid for 1 hour) for the API to access
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': AWS_S3_BUCKET, 'Key': key},
            ExpiresIn=3600
        )
        print(f"✅ Generated presigned URL for S3 object: {key}")
        return presigned_url
    except Exception as e:
        raise Exception(f"Cannot generate presigned URL for S3 object: {str(e)}")

def call_zyla_api(photo: models.Photo) -> Dict:
    headers = {
        "Authorization": f"Bearer {ZYLA_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get the image URL
    image_url = get_image_url_from_photo(photo)
    
    # Use the correct payload format according to API documentation
    payload = {
        "analysis_type": "comprehensive",
        "image_url": image_url,
        "focus_areas": FOCUS_AREAS
    }
    
    print(f"🔄 Calling Zyla API")
    print(f"📍 Endpoint: {ZYLA_URL}")
    print(f"📤 Payload: {json.dumps(payload, indent=2)}")
    print(f"🔑 Authorization Header: Bearer {ZYLA_KEY[:30]}...")
    print(f"🔑 Full API Key (first 50 chars): {ZYLA_KEY[:50]}...")
    
    max_retries = 3
    last_error = None
    
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                delay = BASE_RETRY_DELAY * (2 ** (attempt - 1))
                print(f"⚠️  Retrying in {delay}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(delay)
            
            response = requests.post(
                ZYLA_URL,
                json=payload,
                headers=headers,
                timeout=60
            )
            
            print(f"📥 Response status: {response.status_code}")
            
            # Handle authentication errors (don't retry - key is wrong)
            if response.status_code == 401:
                try:
                    error_detail = response.json()
                    print(f"❌ Authentication failed: {json.dumps(error_detail, indent=2)}")
                except:
                    print(f"❌ Authentication failed: {response.text[:500]}")
                last_error = f"401 Unauthorized - Check API key. Response: {response.text[:200]}"
                break  # Don't retry 401 errors
            
            # Handle rate limiting with retry
            if response.status_code == 503:
                if attempt < max_retries - 1:
                    last_error = f"503 Service Unavailable (attempt {attempt + 1}/{max_retries})"
                    continue
                else:
                    last_error = "503 Service Unavailable - API is rate limiting or down"
                    break
            
            # Check for other errors
            if response.status_code != 200:
                try:
                    error_detail = response.json()
                    print(f"⚠️  API Error Response: {json.dumps(error_detail, indent=2)}")
                except:
                    print(f"⚠️  API Error Response: {response.text[:500]}")
                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                if attempt < max_retries - 1:
                    continue
                break
            
            # Parse response
            result = response.json()
            print(f"📥 Response preview: {str(result)[:300]}")
            
            # Check if API returned success
            if result.get("success") is True:
                print(f"✅ API call successful!")
                return result.get("response", result)
            
            # If explicit failure
            if result.get("success") is False:
                error_msg = result.get("message", "Unknown error")
                print(f"⚠️  API returned error: {error_msg}")
                last_error = error_msg
                break
            
            # If we got data, return it (even if not explicitly marked as success)
            if isinstance(result, dict) and any(key in result for key in ["lesions", "wrinkles", "pores", "pigmentation", "severity", "face_regions"]):
                print(f"✅ API returned analysis data")
                return result
            else:
                last_error = "API returned response but no analysis data found"
                break
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request error: {str(e)}")
            last_error = str(e)
            if attempt < max_retries - 1:
                continue
            break
        
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            last_error = str(e)
            if attempt < max_retries - 1:
                continue
            break
    # All attempts failed - raise error instead of fallback
    error_message = f"Skin analysis service is temporarily unavailable. Please try again later."
    if last_error:
        if "503" in str(last_error):
            error_message = "Skin analysis service is currently overloaded. Please try again in a few moments."
        else:
            error_message = f"Unable to analyze skin: {last_error}. Please try again later."
    raise HTTPException(status_code=503, detail=error_message)

def parse_skin_problems(analysis_result: Dict) -> List[str]:
    problems = []
    
    if not isinstance(analysis_result, dict):
        return ["Analysis completed - check detailed results"]
    
    # 1. Lesions (Acne/Blemishes)
    lesions = analysis_result.get("lesions", {})
    if isinstance(lesions, dict):
        count = lesions.get("count", 0)
        severity = lesions.get("severity", "")
        severity_pct = lesions.get("severity_percentage", 0)
        
        if count > 0:
            problems.append(
                f"Lesions: {count} detected ({severity} severity, {severity_pct*100:.1f}% affected area)"
            )
    
    # 2. Pores (with regional breakdown)
    pores = analysis_result.get("pores", {})
    if isinstance(pores, dict):
        total_pores = 0
        max_severity = "low"
        pore_details = []
        
        for region, region_data in pores.items():
            if isinstance(region_data, dict):
                count = region_data.get("count", 0)
                severity = region_data.get("severity", "low")
                density = region_data.get("density", 0)
                
                total_pores += count
                
                if severity in ["moderate", "severe"]:
                    max_severity = severity
                
                if count > 0:
                    pore_details.append(
                        f"{region}: {count} ({density:.2f}/10k pixels, {severity})"
                    )
        
        if total_pores > 0:
            problems.append(f"Pores: {total_pores} total ({max_severity} severity)")
            if pore_details:
                problems.append(f"  Regional: {', '.join(pore_details)}")
    
    # 3. Wrinkles (with regional scores)
    wrinkles = analysis_result.get("wrinkles", {})
    if isinstance(wrinkles, dict):
        wrinkle_details = []
        max_wrinkle_severity = "none"
        
        for region, region_data in wrinkles.items():
            if isinstance(region_data, dict):
                severity = region_data.get("severity", "none")
                score = region_data.get("wrinkle_score", 0)
                
                if severity != "none":
                    wrinkle_details.append(f"{region}: {severity} (score: {score:.2f})")
                    
                    if severity in ["moderate", "severe"]:
                        max_wrinkle_severity = severity
        
        if max_wrinkle_severity != "none":
            problems.append(f"Wrinkles: {max_wrinkle_severity} severity detected")
            if wrinkle_details:
                problems.append(f"  Regional: {', '.join(wrinkle_details)}")
    
    # 4. Pigmentation (Dark spots)
    pigmentation = analysis_result.get("pigmentation", {})
    if isinstance(pigmentation, dict):
        total_spots = 0
        pig_details = []
        
        for region, region_data in pigmentation.items():
            if isinstance(region_data, dict):
                spots = region_data.get("spot_count", 0)
                density = region_data.get("density", 0)
                
                total_spots += spots
                
                if spots > 0:
                    pig_details.append(
                        f"{region}: {spots} spots ({density:.2f}/10k pixels)"
                    )
        
        if total_spots > 0:
            problems.append(f"Pigmentation: {total_spots} spots detected")
            if pig_details:
                problems.append(f"  Regional: {', '.join(pig_details)}")
    
    # 5. Skin Type
    skin_type_info = analysis_result.get("skin_type", {})
    if isinstance(skin_type_info, dict):
        skin_type_label = skin_type_info.get("label", "")
        confidence = skin_type_info.get("confidence", 0)
        
        if skin_type_label:
            problems.append(
                f"Skin Type: {skin_type_label} (confidence: {confidence*100:.1f}%)"
            )
    
    # 6. Overall Severity
    severity_info = analysis_result.get("severity", {})
    if isinstance(severity_info, dict):
        overall_severity = severity_info.get("overall", "")
        weighted_score = severity_info.get("total_weighted_score", 0)
        confidence = severity_info.get("confidence", 0)
        
        if overall_severity and overall_severity not in ["unknown", ""]:
            if weighted_score > 0 or confidence > 0:
                problems.append(
                    f"Overall Severity: {overall_severity} "
                    f"(weighted score: {weighted_score:.2f}, confidence: {confidence*100:.1f}%)"
                )
            else:
                problems.append(f"Overall Severity: {overall_severity}")
        elif weighted_score > 0:
            problems.append(f"Overall Severity: detected (weighted score: {weighted_score:.2f})")
    
    # 7. Image Quality Assessment
    quality_info = analysis_result.get("quality", {})
    if isinstance(quality_info, dict):
        quality_level = quality_info.get("overall_quality", "")
        quality_score = quality_info.get("quality_score", 0)
        
        if quality_level and quality_level not in ["error", ""]:
            if quality_score > 0:
                problems.append(
                    f"Image Quality: {quality_level} (score: {quality_score*100:.1f}%)"
                )
            else:
                problems.append(f"Image Quality: {quality_level}")
        elif quality_score > 0:
            problems.append(f"Image Quality: acceptable (score: {quality_score*100:.1f}%)")
    
    # 8. Additional skin concerns
    # Oiliness
    if "oiliness" in analysis_result or "shine" in analysis_result:
        oiliness = analysis_result.get("oiliness") or analysis_result.get("shine")
        if isinstance(oiliness, dict) and oiliness.get("level"):
            problems.append(f"Oiliness: {oiliness.get('level')} level detected")
        elif isinstance(oiliness, (int, float)) and oiliness > 0:
            problems.append(f"Oiliness: {oiliness}% detected")
    
    # Dark circles
    if "dark_circles" in analysis_result or "dark_circles_score" in analysis_result:
        dark_circles = analysis_result.get("dark_circles") or analysis_result.get("dark_circles_score")
        if isinstance(dark_circles, dict) and dark_circles.get("severity"):
            problems.append(f"Dark Circles: {dark_circles.get('severity')} severity")
        elif isinstance(dark_circles, (int, float)) and dark_circles > 0:
            problems.append(f"Dark Circles: {dark_circles}% detected")
    
    # Texture issues
    if "texture" in analysis_result:
        texture = analysis_result.get("texture")
        if isinstance(texture, dict) and texture.get("score", 0) > 0:
            problems.append(f"Texture Issues: score {texture.get('score')}")
    
    # Default message if no problems found
    if not problems:
        problems = ["No major skin issues detected"]
    
    print(f"📋 Extracted {len(problems)} skin problems")
    return problems

def generate_recommendations(analysis_result: Dict, skin_problems: List[str]) -> List[str]:
    recommendations = []
    
    if not isinstance(analysis_result, dict):
        return ["Vitamin C", "Hyaluronic Acid", "Retinol"]

    wrinkles = analysis_result.get("wrinkles", {})
    if isinstance(wrinkles, dict) and any(
        isinstance(v, dict) and v.get("severity") in ["moderate", "severe"]
        for v in wrinkles.values()
    ):
        recommendations.extend([
            "Vitamin C",
            "Collagen",
            "Retinol",
            "Vitamin E",
            "Peptides"
        ])
    
    lesions = analysis_result.get("lesions", {})
    pores = analysis_result.get("pores", {})
    
    if (isinstance(lesions, dict) and lesions.get("count", 0) > 0) or \
       (isinstance(pores, dict) and any(
           isinstance(v, dict) and v.get("count", 0) > 0
           for v in pores.values()
       )):
        recommendations.extend([
            "Vitamin A",
            "Zinc",
            "Salicylic Acid",
            "Niacinamide",
            "Tea Tree Oil"
        ])
    
    pigmentation = analysis_result.get("pigmentation", {})
    if isinstance(pigmentation, dict) and any(
        isinstance(v, dict) and v.get("spot_count", 0) > 0
        for v in pigmentation.values()
    ):
        recommendations.extend([
            "Vitamin C",
            "Niacinamide",
            "Vitamin E",
            "Retinol",
            "Alpha Arbutin"
        ])
    
    skin_type_info = analysis_result.get("skin_type", {})
    if isinstance(skin_type_info, dict):
        skin_type_label = skin_type_info.get("label", "").lower()
        
        if "dry" in skin_type_label:
            recommendations.extend([
                "Hyaluronic Acid",
                "Ceramides",
                "Omega-3"
            ])
        elif "oily" in skin_type_label:
            recommendations.extend([
                "Niacinamide",
                "Salicylic Acid",
                "Clay"
            ])
    
    recommendations = list(dict.fromkeys(recommendations))
    
    if not recommendations:
        recommendations = [
            "Vitamin C",
            "Vitamin E",
            "Omega-3",
            "Hyaluronic Acid",
            "Antioxidants"
        ]
    
    return recommendations

@router.post("/analyze/{photo_id}", response_model=schemas.SkinAnalysisResponse)
def analyze_skin(photo_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    try:
        # 1. Retrieve photo
        photo = db.query(models.Photo).filter(
            models.Photo.id == photo_id,
            models.Photo.user_id == current_user.id
        ).first()
        
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # 2. Check if analysis already exists
        existing = db.query(models.SkinAnalysis).filter(
            models.SkinAnalysis.photo_id == photo_id
        ).first()
        
        if existing:
            return {
                "id": existing.id,
                "photo_id": existing.photo_id,
                "analysis_data": json.loads(existing.analysis_data),
                "skin_problems": existing.skin_problems,
                "recommendations": existing.recommendations,
                "created_at": existing.created_at.isoformat()
            }
        
        # 3. Call Zyla API with image URL
        analysis_result = call_zyla_api(photo)
        
        # 5. Parse results
        skin_problems = parse_skin_problems(analysis_result)
        recommendations = generate_recommendations(analysis_result, skin_problems)
        
        # 6. Save to database
        db_analysis = models.SkinAnalysis(
            user_id=current_user.id,
            photo_id=photo_id,
            analysis_data=json.dumps(analysis_result),
            skin_problems=json.dumps(skin_problems),
            recommendations=json.dumps(recommendations)
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        
        # 7. Return response
        return {
            "id": db_analysis.id,
            "photo_id": db_analysis.photo_id,
            "analysis_data": analysis_result,
            "skin_problems": json.dumps(skin_problems),
            "recommendations": json.dumps(recommendations),
            "created_at": db_analysis.created_at.isoformat()
        }
    
    except HTTPException:
        db.rollback()
        raise
    
    except Exception as e:
        db.rollback()
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing skin: {str(e)}")

@router.get("/history", response_model=List[schemas.SkinAnalysisResponse])
def get_skin_analysis_history(skip: int = 0, limit: int = 50, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    analyses = db.query(models.SkinAnalysis).filter(
        models.SkinAnalysis.user_id == current_user.id
    ).order_by(
        models.SkinAnalysis.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    result = []
    for analysis in analyses:
        result.append({
            "id": analysis.id,
            "photo_id": analysis.photo_id,
            "analysis_data": json.loads(analysis.analysis_data),
            "skin_problems": analysis.skin_problems,
            "recommendations": analysis.recommendations,
            "created_at": analysis.created_at.isoformat()
        })
    
    return result

@router.get("/{analysis_id}", response_model=schemas.SkinAnalysisResponse)
def get_skin_analysis(analysis_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    analysis = db.query(models.SkinAnalysis).filter(
        models.SkinAnalysis.id == analysis_id,
        models.SkinAnalysis.user_id == current_user.id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "id": analysis.id,
        "photo_id": analysis.photo_id,
        "analysis_data": json.loads(analysis.analysis_data),
        "skin_problems": analysis.skin_problems,
        "recommendations": analysis.recommendations,
        "created_at": analysis.created_at.isoformat()
    }

@router.delete("/{analysis_id}", status_code=204)
def delete_skin_analysis(analysis_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    analysis = db.query(models.SkinAnalysis).filter(
        models.SkinAnalysis.id == analysis_id,
        models.SkinAnalysis.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    db.delete(analysis)
    db.commit()
    
    return None

# @router.post("/skin-analysis/analyze/{photo_id}", response_model=schemas.SkinAnalysisResponse)
# def analyze_skin(photo_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
#     try:
#         # Verify photo belongs to user
#         photo = db.query(models.Photo).filter(
#             models.Photo.id == photo_id,
#             models.Photo.user_id == current_user.id
#         ).first()
        
#         if not photo:
#             raise HTTPException(status_code=404, detail="Photo not found")
        
#         # Check if analysis already exists
#         existing_analysis = db.query(models.SkinAnalysis).filter(
#             models.SkinAnalysis.photo_id == photo_id
#         ).first()
        
#         if existing_analysis:
#             return {
#                 "id": existing_analysis.id,
#                 "photo_id": existing_analysis.photo_id,
#                 "analysis_data": json.loads(existing_analysis.analysis_data),
#                 "skin_problems": existing_analysis.skin_problems,
#                 "recommendations": existing_analysis.recommendations,
#                 "created_at": existing_analysis.created_at.isoformat()
#             }
        
#         # Get image data for API call
#         # Priority: Use base64 data directly (most reliable), then try public URLs
#         api_url = "https://zylalabs.com/api/9341/face+analyzer+advanced/16879/skin+analysis"
#         api_key = "11301|aQWf0Sb9xNOhwfIWwMVA2Ou4ZpWNQGhMVrp89eHt"
        
#         headers = {
#             "Authorization": f"Bearer {api_key}",
#             "Content-Type": "application/json"
#         }
        
#         # Prepare payloads - prioritize base64 data over URLs
#         payloads = []
#         base64_data = None
        
#         # If we have a data URL, extract base64 and use it directly (most reliable)
#         if photo.s3_url.startswith("data:image"):
#             base64_data = photo.s3_url.split(",")[-1] if "," in photo.s3_url else photo.s3_url
#             print(f"📸 Using base64 data from data URL (length: {len(base64_data)} chars)")
#         else:
#             # For S3 URLs, download directly using boto3 (more reliable than HTTP)
#             print(f"📸 Photo stored as S3 URL, attempting to download using boto3 and convert to base64...")
#             try:
#                 from s3_service import s3_service
                
#                 # Extract key from URL or use filename
#                 if ".s3." in photo.s3_url:
#                     # Extract key from S3 URL: https://bucket.s3.region.amazonaws.com/key
#                     url_parts = photo.s3_url.split(".s3.")
#                     if len(url_parts) > 1:
#                         # Remove query parameters if present
#                         path_part = url_parts[1].split("?")[0]
#                         key = path_part.split("/", 1)[1] if "/" in path_part else path_part
#                     else:
#                         key = photo.filename
#                 else:
#                     key = photo.filename
                
#                 print(f"📸 Extracted S3 key: {key}")
                
#                 try:
#                     # Use boto3 to get object directly (no HTTP needed)
#                     response = s3_service.s3_client.get_object(
#                         Bucket=s3_service.bucket_name,
#                         Key=key
#                     )
#                     image_bytes = response['Body'].read()
#                     base64_data = base64.b64encode(image_bytes).decode('utf-8')
#                     print(f"✅ Successfully downloaded from S3 and converted to base64 (length: {len(base64_data)} chars)")
#                 except Exception as s3_error:
#                     print(f"❌ Could not download from S3 using boto3: {s3_error}")
#                     print(f"❌ Error type: {type(s3_error).__name__}")
#                     # Don't fall back to URL - raise error instead
#                     raise Exception(f"Cannot download image from S3: {s3_error}. Base64 data is required for API.")
#             except Exception as e:
#                 print(f"❌ Error converting S3 image to base64: {e}")
#                 # Don't fall back to URL - we MUST use base64
#                 raise Exception(f"Cannot convert image to base64: {e}. The Zyla API requires base64 data, not URLs.")
        
#         # We MUST have base64 data - URLs don't work (403 Forbidden)
#         if not base64_data:
#             raise HTTPException(
#                 status_code=500, 
#                 detail="Cannot analyze image: Failed to get base64 data. The Zyla API requires base64-encoded images, not URLs."
#             )
        
#         # According to API documentation, the API ONLY accepts HTTP/HTTPS URLs in image_url field
#         # Base64 is NOT supported. The API requires publicly accessible URLs.
#         # 
#         # SOLUTION: Use the S3 public URL (object is uploaded with public-read ACL)
#         # The S3 URL should now be publicly accessible since we set ACL='public-read'
        
#         focus_areas = ["acne", "wrinkles", "pores", "pigmentation", "dark_circles", "oiliness"]
        
#         # Use the S3 URL - it should be publicly accessible now
#         if photo.s3_url and not photo.s3_url.startswith("data:image"):
#             print(f"📸 Using S3 public URL: {photo.s3_url[:100]}...")
#             print(f"📸 Object should be publicly readable (ACL: public-read)")
            
#             payloads = [{
#                 "analysis_type": "comprehensive",
#                 "image_url": photo.s3_url,
#                 "focus_areas": focus_areas
#             }]
#         else:
#             raise HTTPException(
#                 status_code=500,
#                 detail="Cannot analyze image: No valid S3 URL available. The Zyla API requires publicly accessible HTTP/HTTPS URLs."
#             )
        
#         print(f"📸 Using API format: image_url with public S3 URL")
#         print(f"📸 Focus areas: {focus_areas}")
        
#         # REMOVED: URL fallback - URLs cause 403 Forbidden errors from Zyla API
#         # The API cannot access S3 presigned URLs, so we MUST use base64
        
#         analysis_result = None
#         last_error = None
#         successful_payload = None
#         import time
        
#         # Retry logic with exponential backoff for 503 errors
#         max_retries = 3
#         base_delay = 2  # seconds
        
#         for payload_index, payload in enumerate(payloads):
#             # Add longer delay between different payload formats to avoid rate limiting
#             if payload_index > 0:
#                 time.sleep(3)  # 3 second delay between different payload formats to avoid 503 errors
            
#             for attempt in range(max_retries):
#                 try:
#                     # Get the main payload key (image, image_base64, base64, etc.)
#                     # Skip "analysis_type" and "focus_areas" - they're not the image field
#                     payload_keys = [k for k in payload.keys() if k not in ["analysis_type", "focus_areas"]]
#                     payload_key = payload_keys[0] if payload_keys else "unknown"
#                     if attempt > 0:
#                         delay = base_delay * (2 ** (attempt - 1))  # Exponential backoff: 2s, 4s, 8s
#                         print(f"🔄 Retry {attempt}/{max_retries-1} for payload '{payload_key}' after {delay}s delay...")
#                         time.sleep(delay)
#                     else:
#                         print(f"🔄 Trying payload with key: {payload_key}")
                    
#                     response = requests.post(api_url, json=payload, headers=headers, timeout=60)
                    
#                     # Handle 503 Service Unavailable with retry and longer delays
#                     if response.status_code == 503:
#                         if attempt < max_retries - 1:
#                             # Longer delay for 503 errors (rate limiting)
#                             delay = base_delay * (2 ** attempt)  # 2s, 4s, 8s
#                             print(f"⚠️  503 Service Unavailable (rate limited?), waiting {delay}s before retry...")
#                             time.sleep(delay)
#                             last_error = f"503 Service Unavailable (attempt {attempt + 1}/{max_retries})"
#                             continue
#                         else:
#                             last_error = "503 Service Unavailable - API is rate limiting or temporarily down"
#                             print(f"❌ 503 error after {max_retries} attempts - API may be rate limiting")
#                             # Don't break, try next payload format
#                             break
                    
#                     response.raise_for_status()
#                     result = response.json()
                    
#                     # Log FULL response for debugging - we need to see everything
#                     print(f"📥 ========== FULL API Response ==========")
#                     print(f"📥 Status Code: {response.status_code}")
#                     print(f"📥 Payload used: {payload_key} = {str(payload[payload_key])[:100]}...")
#                     print(f"📥 Full Response JSON:")
#                     print(json.dumps(result, indent=2))
#                     print(f"📥 =========================================")
                    
#                     # Check if API actually processed the image
#                     if isinstance(result, dict):
#                         # Check for error messages
#                         if result.get("error"):
#                             error_msg = result.get("message", "Unknown error")
#                             print(f"❌ API returned error: {error_msg}")
#                             last_error = f"API error: {error_msg}"
#                             break
                        
#                         # Check if we have ANY analysis data at all
#                         analysis_fields = ["lesions", "pores", "wrinkles", "pigmentation", "skin_type", "severity", "quality"]
#                         has_any_data = False
#                         for field in analysis_fields:
#                             field_data = result.get(field, {})
#                             if isinstance(field_data, dict) and field_data:
#                                 # Check if dict has any non-empty values
#                                 if any(v for v in field_data.values() if v not in [None, "", 0, 0.0, [], {}]):
#                                     has_any_data = True
#                                     print(f"✅ Found data in {field}: {field_data}")
#                                     break
                        
#                         if not has_any_data:
#                             print(f"⚠️  API returned response but NO analysis data in any field!")
#                             print(f"⚠️  This means the API received the image but didn't process it")
#                             print(f"⚠️  Possible reasons:")
#                             print(f"⚠️    1. Image format not supported")
#                             print(f"⚠️    2. Image too large/small")
#                             print(f"⚠️    3. Base64 encoding issue")
#                             print(f"⚠️    4. API needs different payload format")
                    
#                     # Check if response indicates success
#                     if isinstance(result, dict) and result.get("success") is False:
#                         # API returned error but with 200 status
#                         error_msg = result.get("message", "Unknown error")
#                         last_error = f"API error: {error_msg}"
#                         print(f"❌ API returned error: {error_msg}")
#                         break  # Don't retry on API errors, try next payload
                    
#                     # Check if API is processing asynchronously
#                     if isinstance(result, dict):
#                         # Check for status fields that indicate async processing
#                         status = result.get("status", "").lower()
#                         if status in ["processing", "pending", "in_progress"]:
#                             print(f"⏳ API is processing asynchronously, status: {status}")
#                             # Try to get results from a results field or wait
#                             if "results" in result:
#                                 result = result["results"]
#                             elif "data" in result:
#                                 result = result["data"]
#                             else:
#                                 # If async, we might need to poll - for now, try next payload
#                                 print(f"⚠️  Async processing detected but no results field found")
#                                 last_error = "API is processing asynchronously"
#                                 break
                        
#                         # Check if we have actual analysis data
#                         has_data = False
#                         analysis_keys = ["lesions", "pores", "wrinkles", "pigmentation", "skin_type", "severity", "quality"]
                        
#                         for key in analysis_keys:
#                             if key in result and result[key]:
#                                 has_data = True
#                                 print(f"✅ Found analysis data in field: {key}")
#                                 break
                        
#                         # Also check nested structures
#                         if not has_data and "severity" in result:
#                             severity = result.get("severity", {})
#                             if isinstance(severity, dict) and (severity.get("overall") or severity.get("total_weighted_score", 0) > 0):
#                                 has_data = True
#                                 print(f"✅ Found analysis data in severity field")
                        
#                         if has_data:
#                             analysis_result = result
#                             successful_payload = payload_key
#                             print(f"✅ Skin analysis API call successful with payload: {successful_payload}")
#                             print(f"📊 Response contains analysis data")
#                             break  # Break out of both loops
#                         else:
#                             # Check if response has only metadata or empty analysis fields
#                             metadata_keys = ["log_id", "request_id", "timestamp", "analysis_type", "image_url"]
#                             has_metadata = all(key in result for key in metadata_keys[:3])  # At least log_id, request_id, timestamp
                            
#                             # Check if all analysis fields are empty
#                             all_empty = True
#                             for key in analysis_keys:
#                                 field_data = result.get(key, {})
#                                 if isinstance(field_data, dict) and field_data:
#                                     # Check if dict has any meaningful values
#                                     if any(v for v in field_data.values() if v not in [None, "", 0, 0.0, [], {}, "unknown"]):
#                                         all_empty = False
#                                         break
                            
#                             if has_metadata and all_empty:
#                                 print(f"⚠️  ⚠️  ⚠️  CRITICAL: API received image but returned EMPTY analysis!")
#                                 print(f"⚠️  Response has metadata: {has_metadata}")
#                                 print(f"⚠️  All analysis fields empty: {all_empty}")
#                                 print(f"⚠️  This means:")
#                                 print(f"⚠️    1. API received the image (we can see it in image_url)")
#                                 print(f"⚠️    2. BUT API did NOT process/analyze it")
#                                 print(f"⚠️    3. Possible causes:")
#                                 print(f"⚠️       - Wrong payload format (tried: {payload_key})")
#                                 print(f"⚠️       - Image format not supported")
#                                 print(f"⚠️       - Base64 encoding issue")
#                                 print(f"⚠️       - API expecting different field name")
#                                 print(f"⚠️  Will try next payload format...")
#                                 last_error = f"API received image but returned empty analysis (tried payload: {payload_key})"
#                                 # Continue to next payload
#                                 break
#                             else:
#                                 print(f"⚠️  API returned empty/zero values, trying next payload format...")
#                                 print(f"⚠️  Response keys: {list(result.keys())}")
#                                 last_error = "API returned empty or invalid analysis data"
#                                 break  # Don't retry empty responses, try next payload
#                     else:
#                         analysis_result = result
#                         successful_payload = payload_key
#                         print(f"✅ Skin analysis API call successful with payload: {successful_payload}")
#                         break  # Break out of both loops
                        
#                 except requests.exceptions.HTTPError as e:
#                     if e.response.status_code == 503 and attempt < max_retries - 1:
#                         continue  # Will retry
#                     last_error = str(e)
#                     print(f"❌ HTTP error with payload {payload_key}: {e}")
#                     break  # Try next payload
#                 except requests.exceptions.RequestException as e:
#                     last_error = str(e)
#                     print(f"❌ Request failed with payload {payload_key}: {e}")
#                     break  # Try next payload
                
#             # If we got a successful result, break out of payload loop
#             if analysis_result is not None:
#                 break
        
#         if analysis_result is None:
#             raise HTTPException(status_code=500, detail=f"Error calling skin analysis API: {last_error}. Tried {len(payloads)} different payload formats.")
        
#         print(f"✅ Zyla API Response received: {type(analysis_result)}")
#         print(f"📊 Response keys: {list(analysis_result.keys()) if isinstance(analysis_result, dict) else 'Not a dict'}")
#         if isinstance(analysis_result, dict):
#             # Print ALL data fields for debugging
#             print(f"📊 FULL analysis_result structure:")
#             print(json.dumps(analysis_result, indent=2)[:3000])
            
#             # Check for analysis data in various possible locations
#             if "severity" in analysis_result:
#                 print(f"📊 Severity data: {analysis_result.get('severity')}")
#             if "quality" in analysis_result:
#                 print(f"📊 Quality data: {analysis_result.get('quality')}")
#             if "lesions" in analysis_result:
#                 print(f"📊 Lesions data: {analysis_result.get('lesions')}")
#             if "pores" in analysis_result:
#                 print(f"📊 Pores data: {analysis_result.get('pores')}")
#             if "wrinkles" in analysis_result:
#                 print(f"📊 Wrinkles data: {analysis_result.get('wrinkles')}")
#             if "pigmentation" in analysis_result:
#                 print(f"📊 Pigmentation data: {analysis_result.get('pigmentation')}")
        
#         # Extract comprehensive skin problems and recommendations from Zyla API response
#         # The API provides detailed regional analysis, severity indices, and percentages
#         skin_problems = []
#         recommendations = []
        
#         if isinstance(analysis_result, dict):
#             problems_found = []
            
#             print(f"🔍 Extracting skin problems from analysis_result...")
#             print(f"🔍 Available keys in analysis_result: {list(analysis_result.keys())}")
            
#             # Extract lesions with detailed metrics (acne/blemishes)
#             lesions = analysis_result.get("lesions", {})
#             print(f"🔍 Lesions data: {lesions}")
#             if isinstance(lesions, dict) and lesions.get("count", 0) > 0:
#                 count = lesions.get("count", 0)
#                 severity = lesions.get("severity", "detected")
#                 severity_pct = lesions.get("severity_percentage", 0)
#                 problems_found.append(f"Lesions: {count} detected ({severity} severity, {severity_pct*100:.1f}% affected area)")
            
#             # Extract pores with regional breakdown
#             pores = analysis_result.get("pores", {})
#             print(f"🔍 Pores data: {pores}")
#             if isinstance(pores, dict):
#                 total_pores = 0
#                 max_severity = "low"
#                 pore_details = []
#                 for region, region_data in pores.items():
#                     if isinstance(region_data, dict):
#                         count = region_data.get("count", 0)
#                         severity = region_data.get("severity", "low")
#                         density = region_data.get("density", 0)
#                         total_pores += count
#                         if severity in ["moderate", "severe"]:
#                             max_severity = severity
#                         if count > 0:
#                             pore_details.append(f"{region}: {count} ({density:.2f}/10k pixels, {severity})")
#                 if total_pores > 0:
#                     problems_found.append(f"Pores: {total_pores} total ({max_severity} severity)")
#                     if pore_details:
#                         problems_found.append(f"  Regional: {', '.join(pore_details)}")
            
#             # Extract wrinkles with regional scores
#             wrinkles = analysis_result.get("wrinkles", {})
#             print(f"🔍 Wrinkles data: {wrinkles}")
#             if isinstance(wrinkles, dict):
#                 wrinkle_details = []
#                 max_wrinkle_severity = "none"
#                 for region, region_data in wrinkles.items():
#                     if isinstance(region_data, dict):
#                         severity = region_data.get("severity", "none")
#                         score = region_data.get("wrinkle_score", 0)
#                         if severity != "none":
#                             wrinkle_details.append(f"{region}: {severity} (score: {score:.2f})")
#                             if severity in ["moderate", "severe"]:
#                                 max_wrinkle_severity = severity
#                 if max_wrinkle_severity != "none":
#                     problems_found.append(f"Wrinkles: {max_wrinkle_severity} severity detected")
#                     if wrinkle_details:
#                         problems_found.append(f"  Regional: {', '.join(wrinkle_details)}")
            
#             # Extract pigmentation with regional breakdown (dark spots)
#             pigmentation = analysis_result.get("pigmentation", {})
#             print(f"🔍 Pigmentation data: {pigmentation}")
#             if isinstance(pigmentation, dict):
#                 total_spots = 0
#                 pig_details = []
#                 for region, region_data in pigmentation.items():
#                     if isinstance(region_data, dict):
#                         spots = region_data.get("spot_count", 0)
#                         density = region_data.get("density", 0)
#                         total_spots += spots
#                         if spots > 0:
#                             pig_details.append(f"{region}: {spots} spots ({density:.2f}/10k pixels)")
#                 if total_spots > 0:
#                     problems_found.append(f"Pigmentation: {total_spots} spots detected")
#                     if pig_details:
#                         problems_found.append(f"  Regional: {', '.join(pig_details)}")
            
#             # Get skin type with confidence
#             skin_type_info = analysis_result.get("skin_type", {})
#             if isinstance(skin_type_info, dict):
#                 skin_type_label = skin_type_info.get("label", "")
#                 confidence = skin_type_info.get("confidence", 0)
#                 if skin_type_label:
#                     problems_found.append(f"Skin Type: {skin_type_label} (confidence: {confidence*100:.1f}%)")
            
#             # Get overall severity with component scores
#             severity_info = analysis_result.get("severity", {})
#             if isinstance(severity_info, dict):
#                 overall_severity = severity_info.get("overall", "")
#                 weighted_score = severity_info.get("total_weighted_score", 0)
#                 confidence = severity_info.get("confidence", 0)
#                 # Only add if we have meaningful data
#                 if overall_severity and overall_severity != "unknown" and overall_severity != "":
#                     if weighted_score > 0 or confidence > 0:
#                         problems_found.append(f"Overall Severity: {overall_severity} (weighted score: {weighted_score:.2f}, confidence: {confidence*100:.1f}%)")
#                     else:
#                         problems_found.append(f"Overall Severity: {overall_severity}")
#                 elif weighted_score > 0:
#                     problems_found.append(f"Overall Severity: detected (weighted score: {weighted_score:.2f})")
            
#             # Quality assessment
#             quality_info = analysis_result.get("quality", {})
#             if isinstance(quality_info, dict):
#                 quality_level = quality_info.get("overall_quality", "")
#                 quality_score = quality_info.get("quality_score", 0)
#                 # Only add if we have meaningful data
#                 if quality_level and quality_level != "error" and quality_level != "":
#                     if quality_score > 0:
#                         problems_found.append(f"Image Quality: {quality_level} (score: {quality_score*100:.1f}%)")
#                     else:
#                         problems_found.append(f"Image Quality: {quality_level}")
#                 elif quality_score > 0:
#                     problems_found.append(f"Image Quality: acceptable (score: {quality_score*100:.1f}%)")
            
#             # Also check for other common skin problem indicators
#             # Check for oiliness/shine
#             if "oiliness" in analysis_result or "shine" in analysis_result:
#                 oiliness = analysis_result.get("oiliness") or analysis_result.get("shine")
#                 if isinstance(oiliness, dict) and oiliness.get("level"):
#                     problems_found.append(f"Oiliness: {oiliness.get('level')} level detected")
#                 elif isinstance(oiliness, (int, float)) and oiliness > 0:
#                     problems_found.append(f"Oiliness: {oiliness}% detected")
            
#             # Check for dark circles
#             if "dark_circles" in analysis_result or "dark_circles_score" in analysis_result:
#                 dark_circles = analysis_result.get("dark_circles") or analysis_result.get("dark_circles_score")
#                 if isinstance(dark_circles, dict) and dark_circles.get("severity"):
#                     problems_found.append(f"Dark Circles: {dark_circles.get('severity')} severity")
#                 elif isinstance(dark_circles, (int, float)) and dark_circles > 0:
#                     problems_found.append(f"Dark Circles: {dark_circles}% detected")
            
#             # Check for texture issues
#             if "texture" in analysis_result:
#                 texture = analysis_result.get("texture")
#                 if isinstance(texture, dict) and texture.get("score", 0) > 0:
#                     problems_found.append(f"Texture Issues: score {texture.get('score')}")
            
#             skin_problems = problems_found if problems_found else ["No major issues detected"]
            
#             print(f"📋 Extracted {len(skin_problems)} skin problems: {skin_problems}")
#             if len(skin_problems) == 1 and skin_problems[0] == "No major issues detected":
#                 print(f"⚠️  WARNING: No skin problems extracted from API response!")
#                 print(f"⚠️  This might mean the API didn't process the image correctly")
#                 print(f"⚠️  Full response structure: {json.dumps(analysis_result, indent=2)[:2000]}")
            
#             # Generate comprehensive recommendations based on all detected issues
#             if isinstance(wrinkles, dict) and any(
#                 isinstance(v, dict) and v.get("severity") in ["moderate", "severe"]
#                 for v in wrinkles.values()
#             ):
#                 recommendations.extend(["Vitamin C", "Collagen", "Retinol", "Vitamin E", "Peptides"])
            
#             if (isinstance(lesions, dict) and lesions.get("count", 0) > 0) or \
#                (isinstance(pores, dict) and any(
#                    isinstance(v, dict) and v.get("count", 0) > 0
#                    for v in pores.values()
#                )):
#                 recommendations.extend(["Vitamin A", "Zinc", "Salicylic Acid", "Niacinamide", "Tea Tree Oil"])
            
#             if isinstance(pigmentation, dict) and any(
#                 isinstance(v, dict) and v.get("spot_count", 0) > 0
#                 for v in pigmentation.values()
#             ):
#                 recommendations.extend(["Vitamin C", "Niacinamide", "Vitamin E", "Retinol", "Alpha Arbutin"])
            
#             # Check skin type for additional recommendations
#             if isinstance(skin_type_info, dict):
#                 skin_type_label = skin_type_info.get("label", "").lower()
#                 if "dry" in skin_type_label:
#                     recommendations.extend(["Hyaluronic Acid", "Ceramides", "Omega-3"])
#                 elif "oily" in skin_type_label:
#                     recommendations.extend(["Niacinamide", "Salicylic Acid", "Clay"])
            
#             # Remove duplicates
#             recommendations = list(dict.fromkeys(recommendations))
            
#             if not recommendations:
#                 recommendations = ["Vitamin C", "Vitamin E", "Omega-3", "Hyaluronic Acid", "Antioxidants"]  # General skin health
        
#         # Ensure we always have at least one problem entry
#         if not skin_problems:
#             skin_problems = ["Analysis completed - check detailed results"]
        
#         # Convert to strings for storage
#         skin_problems_str = json.dumps(skin_problems) if isinstance(skin_problems, (list, dict)) else str(skin_problems)
#         recommendations_str = json.dumps(recommendations) if isinstance(recommendations, (list, dict)) else str(recommendations)
        
#         print(f"💾 Storing skin_problems_str: {skin_problems_str[:200]}...")
#         print(f"💾 Storing recommendations_str: {recommendations_str[:200]}...")
        
#         # Store analysis in database
#         db_analysis = models.SkinAnalysis(
#             user_id=current_user.id,
#             photo_id=photo_id,
#             analysis_data=json.dumps(analysis_result),
#             skin_problems=skin_problems_str,
#             recommendations=recommendations_str
#         )
#         db.add(db_analysis)
#         db.commit()
#         db.refresh(db_analysis)
        
#         response_data = {
#             "id": db_analysis.id,
#             "photo_id": db_analysis.photo_id,
#             "analysis_data": analysis_result,
#             "skin_problems": skin_problems_str,
#             "recommendations": recommendations_str,
#             "created_at": db_analysis.created_at.isoformat()
#         }
        
#         print(f"📤 Returning response with skin_problems: {response_data['skin_problems'][:200]}...")
#         return response_data
    
#     except HTTPException:
#         db.rollback()
#         raise
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Error analyzing skin: {str(e)}")
