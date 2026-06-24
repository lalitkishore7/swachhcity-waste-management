import urllib.request
import os

urls = [
    "https://github.com/gianlucasposito/YOLO-Waste-Detection/raw/main/best_model.pt",
    "https://github.com/jeremy-rico/litter-detection/raw/main/runs/detect/train/weights/best.pt",
    "https://github.com/RunRiotComeOn/yolov8-based-garbage-classification-app/raw/main/models/garbage_yolov8s/weights/best.pt",
    "https://github.com/Muhammad-Hassan-Farid/YoloV8n-for-Wast-Recycle-Plant/raw/main/models/yolov8n_waste.pt",
    "https://github.com/Antraxmin/Trash-Detection-API/raw/main/models/best.pt",
    "https://github.com/noorkhokhar99/YOLOv8-Garbage-Overflow-Detection-on-a-Custom-Dataset-Real-Time-Detection-with-Flask-Web-App/raw/main/best.pt",
    "https://github.com/AarohiSingla/Garbage-Classification-using-Yolov8/raw/main/best.pt",
    "https://github.com/Jitesh17/Waste-Detection-using-YOLOv8/raw/main/runs/detect/train/weights/best.pt",
    "https://github.com/sartian17/Litter-Detection-YoloV8/raw/main/runs/detect/train/weights/best.pt",
    "https://github.com/marlon-tru/Garbage-detection-YOLOv8/raw/main/weights/best.pt",
    "https://github.com/Tech-a-thon/Waste-Classification-YoloV8/raw/main/best.pt"
]

output_path = r"c:\Users\codin\desktop\swachhcity-waste-management\ml-service\yolov8n-trash.pt"

success = False
for url in urls:
    print(f"Trying {url}...")
    try:
        req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        if response.status == 200:
            print(f"Found accessible model at {url}. Downloading...")
            urllib.request.urlretrieve(url, output_path)
            print("Download complete.")
            success = True
            break
    except Exception as e:
        print(f"Failed: {e}")
        pass

if not success:
    print("All URLs failed.")
