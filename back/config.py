import os
from dotenv import load_dotenv

load_dotenv()

FRONT_URL=os.getenv("FRONT_URL")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_S3_REGION = os.getenv("AWS_S3_REGION")

ZYLA_URL = os.getenv("ZYLA_URL")
ZYLA_KEY = os.getenv("ZYLA_KEY")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

YOLO_MODEL_PATH = "best.pt"