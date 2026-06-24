import requests
import sys

def test_image(label, filename):
    url = "http://127.0.0.1:5001/analyze-preview"
    try:
        with open(filename, 'rb') as f:
            files = {'image': f}
            response = requests.post(url, files=files)
            print(f"--- {label} ---")
            print("Status Code:", response.status_code)
            data = response.json()
            is_garbage = data.get('is_garbage')
            print(f"Is Garbage: {is_garbage}")
            print(f"Detections: {data.get('all_detections')}")
            print("-" * 20)
    except Exception as e:
        print("Error:", e)

test_image("TRASH", r"c:\Users\codin\desktop\swachhcity-waste-management\test-trash.jpeg")
test_image("CLEAN", r"c:\Users\codin\desktop\swachhcity-waste-management\test-clean.jpeg")
