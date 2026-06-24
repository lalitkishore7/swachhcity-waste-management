from ultralytics import YOLO

model = YOLO("yolov8n-trash.pt")
print("\n--- Model Classes ---")
for k, v in model.names.items():
    print(f"{k}: '{v}'")

print("\n--- Testing on test-trash.jpeg ---")
results = model.predict(r"c:\Users\codin\desktop\swachhcity-waste-management\test-trash.jpeg", conf=0.1)
for result in results:
    for box in result.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = result.names[cls_id]
        print(f"[{cls_id}] {label}: {conf:.2f}")

print("\nFinished.")
