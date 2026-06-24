from ultralytics import YOLO

model = YOLO("yolov8n-trash.pt")
print("Total classes:", len(model.names))

garbage_keywords = ['waste', 'trash', 'garbage', 'can', 'bottle', 'plastic', 'bag', 'box', 'cup', 'wrapper', 'litter']
matching_classes = {k: v for k, v in model.names.items() if any(kw in v.lower() for kw in garbage_keywords)}

print("\nPotential Garbage Classes:")
for k, v in matching_classes.items():
    print(f"{k}: '{v}'")
