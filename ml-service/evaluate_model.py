from ultralytics import YOLO

def evaluate_accuracy():
    # 1. Load the pre-trained model
    model = YOLO("yolov8n-trash.pt")
    
    print("Starting model evaluation...")
    
    # 2. Run validation
    # Note: You MUST have the dataset configuration file (e.g., data.yaml)
    # and the validation images in the specified paths for this to work.
    try:
        # data="garbage_dataset/data.yaml" is the path to your dataset config
        metrics = model.val(data="garbage_dataset/data.yaml")
        
        # 3. Extract accuracy metrics
        map50_95 = metrics.box.map    # Mean Average Precision (mAP) at IoU 50-95
        map50 = metrics.box.map50     # mAP at IoU 50
        precision = metrics.box.mp    # Mean Precision
        recall = metrics.box.mr       # Mean Recall
        
        print("\n--- Model Accuracy Metrics ---")
        print(f"Accuracy (mAP50-95): {map50_95:.4f} (This is the strict accuracy)")
        print(f"Accuracy (mAP50):    {map50:.4f} (This is typically the ~87.3% figure)")
        print(f"Precision:           {precision:.4f}")
        print(f"Recall:              {recall:.4f}")
        
    except FileNotFoundError:
        print("\n[ERROR] Dataset not found. You need the 'garbage_dataset/data.yaml' file and test images to calculate the accuracy locally.")

if __name__ == "__main__":
    evaluate_accuracy()
