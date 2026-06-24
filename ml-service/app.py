from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import io
import math
import numpy as np
from PIL import Image

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Lazy-load YOLOv8 Custom Trash Model
# ---------------------------------------------------------------------------
_model = None

def get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO

        # Now using the custom-trained raw Github weights for Waste Classification!
        model_path = os.environ.get("YOLO_MODEL_PATH", "yolov8n-trash.pt")
        print(f"[ML] Loading YOLOv8 model from {model_path} ...")
        _model = YOLO(model_path)
        print("[ML] YOLOv8 model loaded successfully.")
    return _model

# The custom model classes: 0: 'Glass', 1: 'Metal', 2: 'Paper', 3: 'Plastic', 4: 'Waste'
GARBAGE_TYPE_MAP = {
    "Glass": "glass",
    "Metal": "metal",
    "Paper": "paper",
    "Plastic": "plastic",
    "Waste": "mixed"
}

def analyze_image_bytes(image_bytes: bytes, check_clean: bool = False):
    """
    Run YOLOv8 inference and return garbage detection result.
    Since the model is strictly trained on waste, ANY confident detection is garbage.
    """
    model = get_model()

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_w, original_h = img.size

    # Run inference
    results = model.predict(source=img, conf=0.15, verbose=False)[0]

    detections = []
    garbage_detections = [] # With this custom model, all detections ARE garbage

    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = results.names[cls_id]
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        det = {
            "class_id": cls_id,
            "label": label,
            "confidence": round(conf, 4),
            "box": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
        }
        detections.append(det)
        garbage_detections.append(det)

    # Determine is_garbage
    if check_clean:
        # For cleanup verification: garbage present = failure
        is_garbage = len(garbage_detections) > 0
        if is_garbage:
            max_conf = max(d["confidence"] for d in garbage_detections)
            severity_score = round(min(1.0, max_conf * 1.2), 3)
            garbage_type = "garbage_present"
        else:
            severity_score = 0.0
            garbage_type = "clean"
        confidence = round(
            max((d["confidence"] for d in garbage_detections), default=0.0), 3
        )
    else:
        # For complaint submission: must detect garbage to accept the image
        is_garbage = len(garbage_detections) > 0

        if is_garbage:
            max_conf = max(d["confidence"] for d in garbage_detections)
            # Severity based on number of items and confidence
            count_factor = min(1.0, len(garbage_detections) / 5.0)
            severity_score = round(
                min(1.0, 0.6 * max_conf + 0.4 * count_factor), 3
            )

            # Determine garbage type from the most confident detection
            best_det = max(garbage_detections, key=lambda d: d["confidence"])
            garbage_type = GARBAGE_TYPE_MAP.get(best_det["label"], "mixed")
            confidence = round(max_conf, 3)
        else:
            severity_score = 0.0
            garbage_type = "none"
            confidence = 0.0

    # Build a representative bounding box (union of garbage detections)
    if garbage_detections:
        all_x1 = min(d["box"][0] for d in garbage_detections)
        all_y1 = min(d["box"][1] for d in garbage_detections)
        all_x2 = max(d["box"][0] + d["box"][2] for d in garbage_detections)
        all_y2 = max(d["box"][1] + d["box"][3] for d in garbage_detections)
        box_coordinates = [all_x1, all_y1, all_x2 - all_x1, all_y2 - all_y1]
    else:
        box_coordinates = [0, 0, original_w, original_h]

    return {
        "is_garbage": bool(is_garbage),
        "severity_score": severity_score,
        "garbage_type": garbage_type,
        "confidence": confidence,
        "box_coordinates": box_coordinates,
        "detection_count": len(garbage_detections),
        "all_detections": [
            {"label": d["label"], "confidence": d["confidence"]} for d in detections[:10]
        ],
    }


# ===========================================================================
# Routes
# ===========================================================================


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ML Service Running", "model": "YOLOv8n-Trash (Custom)"})


@app.route("/predict", methods=["POST"])
def predict():
    """
    Analyse an image and return garbage detection result.
    Query param: check_clean=true  → verify if area is clean (for worker proof)
    """
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    check_clean = request.args.get("check_clean", "false").lower() == "true"
    image_bytes = request.files["image"].read()

    result = analyze_image_bytes(image_bytes, check_clean)
    return jsonify(result)


@app.route("/analyze-preview", methods=["POST"])
def analyze_preview():
    """
    Same as /predict but intended for client-side pre-submission preview.
    Does NOT store anything – just returns analysis.
    """
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image_bytes = request.files["image"].read()
    result = analyze_image_bytes(image_bytes, check_clean=False)
    return jsonify(result)


@app.route("/hotspot", methods=["POST"])
def hotspot():
    """
    Hotspot prediction from historical complaint data.
    Body: { complaints: [ { latitude, longitude, severity_score, created_at }, ... ] }
    Returns: list of hotspot zones with predicted risk scores.
    """
    data = request.get_json(force=True, silent=True) or {}
    complaints = data.get("complaints", [])

    if not complaints:
        return jsonify({"hotspots": [], "message": "No complaint history provided"})

    # Grid-based clustering: 0.01 degree ≈ 1.1 km
    GRID_SIZE = 0.01
    grid = {}

    for c in complaints:
        try:
            lat = float(c.get("latitude", 0))
            lon = float(c.get("longitude", 0))
            severity = float(c.get("severity_score", 0.5))
        except (TypeError, ValueError):
            continue

        grid_lat = round(math.floor(lat / GRID_SIZE) * GRID_SIZE, 4)
        grid_lon = round(math.floor(lon / GRID_SIZE) * GRID_SIZE, 4)
        key = (grid_lat, grid_lon)

        if key not in grid:
            grid[key] = {
                "count": 0,
                "severity_sum": 0.0,
                "lat": grid_lat,
                "lon": grid_lon,
            }
        grid[key]["count"] += 1
        grid[key]["severity_sum"] += severity

    hotspots = []
    for key, cell in grid.items():
        avg_severity = cell["severity_sum"] / cell["count"]
        count_score = math.log1p(cell["count"]) / math.log1p(len(complaints))
        risk_score = round(0.55 * avg_severity + 0.45 * count_score, 3)

        hotspots.append(
            {
                "latitude": cell["lat"],
                "longitude": cell["lon"],
                "complaint_count": cell["count"],
                "avg_severity": round(avg_severity, 3),
                "risk_score": risk_score,
                "label": (
                    "High Risk"
                    if risk_score > 0.6
                    else ("Medium Risk" if risk_score > 0.3 else "Low Risk")
                ),
            }
        )

    hotspots.sort(key=lambda x: x["risk_score"], reverse=True)
    hotspots = hotspots[:20]

    return jsonify({"hotspots": hotspots})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
