import cv2
import pandas as pd
from ultralytics import YOLO
import tkinter as tk
from tkinter import filedialog
import os

def run_fruit_detection():
    # --- 1. SETUP PATHS ---
    model_path = r"D:\30_ENGINEERING_LAB\31_CODE_REPOS\DermaFridge\runs\detect\derma_fridge_model\weights\best.pt"

    print(f" Loading model from: {model_path}")
    if not os.path.exists(model_path):
        print(" Error: Could not find the model file!")
        print("Please check if the 'runs' folder is in the same directory as this script.")
        return

    # Load the model
    model = YOLO(model_path)
    print(" Model loaded successfully!")

    # --- 2. SELECT IMAGE ---
    print(" Please select an image file from the popup window...")
    root = tk.Tk()
    root.withdraw() 
    image_path = filedialog.askopenfilename(
        title="Select a Fruit Image to Test",
        filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp")]
    )

    if not image_path:
        print(" No file selected. Exiting.")
        return

    print(f" Processing: {image_path} ...")

    # --- 3. RUN DETECTION ---
    results = model.predict(image_path, conf=0.5, verbose=False)
    result = results[0] # Get the first 

    # --- 4. COUNT ITEMS ---
    detected_classes = result.boxes.cls.cpu().numpy().astype(int)
    
    # Dictionary to store counts
    counts = {}
    
    # Map IDs back to names 
    for cls_id in detected_classes:
        name = result.names[cls_id]
        counts[name] = counts.get(name, 0) + 1

    # --- 5. CREATE TABLE ---
    table_data = []
    total_count = 0
    
    for full_name, count in counts.items():
        if "-" in full_name:
            item, status_raw = full_name.split("-", 1)
            status = status_raw.title() 
        else:
            item, status = full_name, "Unknown"
            
        table_data.append({
            "Item": item,
            "Status": status,
            "Amount": count
        })
        total_count += count

    df = pd.DataFrame(table_data)
    
    # Sort it to look organized by Item name
    if not df.empty:
        df = df.sort_values(by=["Item", "Status"])

    # --- 6. DISPLAY OUTPUT ---
    print("\n" + "="*50)
    print(f"  DETECTION REPORT FOR: {os.path.basename(image_path)}")
    print("="*50)
    
    if df.empty:
        print("No items detected.")
    else:
        print(df.to_string(index=False))
        print("-" * 50)
        print(f"TOTAL ITEMS: {total_count}")
    print("="*50 + "\n")

    # --- 7. SHOW IMAGE WINDOW ---
    plotted_image = result.plot()

    # Resize image 
    screen_res = 1280, 720
    scale_width = screen_res[0] / plotted_image.shape[1]
    scale_height = screen_res[1] / plotted_image.shape[0]
    scale = min(scale_width, scale_height)
    
    if scale < 1:
        window_width = int(plotted_image.shape[1] * scale)
        window_height = int(plotted_image.shape[0] * scale)
        plotted_image = cv2.resize(plotted_image, (window_width, window_height))

    cv2.imshow("DermaFridge Detection Result (Press any key to close)", plotted_image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_fruit_detection()
