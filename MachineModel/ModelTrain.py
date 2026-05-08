import os
import yaml
from ultralytics import YOLO
import torch

def train_fruit_detector():
    # 1. SETUP PATHS
    base_path = r"D:\30_ENGINEERING_LAB\31_CODE_REPOS\DermaFridge\Dataset"
    
    # 2. CREATE DATA.YAML
    yaml_content = {
        'path': base_path,
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 28,
        'names': [
            'Apple-Fresh', 'Apple-Rotten', 'Banana-Fresh', 'Banana-Rotten', 
            'Carrot-Fresh', 'Carrot-Rotten', 'Cucumber-Fresh', 'Cucumber-Rotten', 
            'Grapes-Fresh', 'Grapes-Rotten', 'Guava-Fresh', 'Guava-Rotten', 
            'Jujube-Fresh', 'Jujube-Rotten', 'Mango-fresh', 'Mango-rotten', 
            'Orange-Fresh', 'Orange-Rotten', 'Pepper-Fresh', 'Pepper-Rotten', 
            'Pomegranate-Fresh', 'Pomegranate-Rotten', 'Potato-Fresh', 'Potato-Rotten', 
            'Strawberry-Fresh', 'Strawberry-Rotten', 'Tomato-Fresh', 'Tomato-Rotten'
        ]
    }

    yaml_path = os.path.join(os.getcwd(), 'fruit_data_config.yaml')
    
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f, sort_keys=False)
    
    print(f"Configuration file created at: {yaml_path}")

    # 3. CHECK GPU
    if torch.cuda.is_available():
        print(f"GPU Detected: {torch.cuda.get_device_name(0)}")
        device = 0 
    else:
        print("GPU not found. Training will be slow on CPU.")
        device = 'cpu'

    # 4. INITIALIZE MODEL
    model = YOLO('yolov8m.pt') 

    # 5. START TRAINING
    print("Starting Training...")
    results = model.train(
        data=yaml_path,
        epochs=50,          
        imgsz=640,          
        batch=16,           
        device=device,     
        patience=10,        
        name='derma_fridge_model' 
    )

    print("Training Complete!")
    print(f"Best weights saved at: {os.path.join(os.getcwd(), 'runs', 'detect', 'derma_fridge_model', 'weights', 'best.pt')}")

if __name__ == '__main__':
    train_fruit_detector()
