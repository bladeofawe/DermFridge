from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import boto3
import base64
from datetime import datetime

import models, schemas
from db import get_db
from auth import get_current_user_from_cookie
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_REGION

router = APIRouter()

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_S3_REGION
)

def upload_to_s3(image_base64: str, user_id: int, source: str):
    try:
        if "," in image_base64:
            image_data = base64.b64decode(image_base64.split(",")[1])
        else:
            image_data = base64.b64decode(image_base64)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S%f")[:-3]
        filename = f"photos/{user_id}/{source}_{timestamp}.jpg"
        
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=filename,
            Body=image_data,
            ContentType="image/jpeg",
            ServerSideEncryption="AES256"
        )
        
        s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_S3_REGION}.amazonaws.com/{filename}"
        return {"filename": filename, "s3_url": s3_url}
    
    except Exception as e:
        raise Exception(f"S3 upload error: {str(e)}")

@router.post("/upload")
def upload_photo(request: schemas.PhotoUploadRequest, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="Missing image")
        
        s3_result = upload_to_s3(request.image, current_user.id, request.source)
        
        db_photo = models.Photo(
            user_id=current_user.id,
            filename=s3_result["filename"],
            s3_url=s3_result["s3_url"],
            source=request.source
        )
        db.add(db_photo)
        db.commit()
        db.refresh(db_photo)
        
        return {
            "id": db_photo.id,
            "filename": db_photo.filename,
            "s3_url": db_photo.s3_url,
            "message": "Photo uploaded successfully"
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def get_presigned_url_for_photo(photo: models.Photo) -> str:
    """Generate a presigned URL for a photo (valid for 1 hour)"""
    try:
        # If it's a data URL, return as-is
        if photo.s3_url.startswith("data:image"):
            return photo.s3_url
        
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
        
        # Generate presigned URL (valid for 1 hour)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': AWS_S3_BUCKET, 'Key': key},
            ExpiresIn=3600
        )
        return presigned_url
    except Exception as e:
        print(f"Error generating presigned URL for photo {photo.id}: {str(e)}")
        # Fallback to stored URL if presigned URL generation fails
        return photo.s3_url

@router.get("/", response_model=List[schemas.PhotoResponse])
def get_user_photos(skip: int = 0, limit: int = 50, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    photos = db.query(models.Photo).filter(
        models.Photo.user_id == current_user.id
    ).order_by(models.Photo.uploaded_at.desc()).offset(skip).limit(limit).all()
    
    # Convert datetime to ISO format string and generate presigned URLs for each photo
    result = []
    for photo in photos:
        presigned_url = get_presigned_url_for_photo(photo)
        result.append({
            "id": photo.id,
            "filename": photo.filename,
            "s3_url": presigned_url,  # Return presigned URL instead of regular S3 URL
            "source": photo.source,
            "uploaded_at": photo.uploaded_at.isoformat() if photo.uploaded_at else ""
        })
    return result

@router.delete("/{photo_id}", status_code=204)
def delete_photo(photo_id: int, current_user: models.User = Depends(get_current_user_from_cookie), db: Session = Depends(get_db)):
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.user_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    try:
        s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=photo.filename)
    except Exception as e:
        print(f"S3 deletion error: {e}")
    
    db.delete(photo)
    db.commit()