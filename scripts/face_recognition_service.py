"""Offline YuNet + SFace worker for GYM ERP.

The process uses JSON lines on stdin/stdout so the TypeScript desktop app can
keep the recognition implementation local while reusing its encrypted storage
and synchronization logic.
"""

import base64
import json
import os
import sys

import cv2
import numpy as np


def fail(message):
    print(json.dumps({"ok": False, "error": message}), flush=True)


def main():
    model_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join("models", "face")
    detector_path = os.path.join(model_dir, "face_detection_yunet_2023mar.onnx")
    recognizer_path = os.path.join(model_dir, "face_recognition_sface_2021dec.onnx")
    if not os.path.exists(detector_path) or not os.path.exists(recognizer_path):
        raise RuntimeError(
            "Local face models are missing. Run scripts\\install-face-models.cmd first."
        )

    detector = cv2.FaceDetectorYN.create(detector_path, "", (320, 320), 0.7, 0.3, 5000)
    recognizer = cv2.FaceRecognizerSF.create(recognizer_path, "")

    for line in sys.stdin:
        try:
            request = json.loads(line)
            operation = request.get("operation")
            if operation == "status":
                print(json.dumps({"ok": True, "engineId": "face.python-yunet-sface"}), flush=True)
                continue
            width = int(request["width"])
            height = int(request["height"])
            raw = base64.b64decode(request["rgbaBase64"])
            if len(raw) != width * height * 4:
                raise ValueError("The camera frame has an invalid size.")
            rgba = np.frombuffer(raw, dtype=np.uint8).reshape((height, width, 4))
            bgr = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGR)
            detector.setInputSize((width, height))
            _, faces = detector.detect(bgr)
            detections = []
            if faces is not None:
                for face in faces:
                    x, y, w, h = [float(value) for value in face[:4]]
                    detections.append({"box": {"x": x, "y": y, "width": w, "height": h}, "raw": face.tolist()})
            result = {"ok": True, "detections": detections}
            if operation == "embed" and detections:
                face = np.asarray(detections[0]["raw"], dtype=np.float32)
                aligned = recognizer.alignCrop(bgr, face)
                feature = recognizer.feature(aligned)
                vector = feature.reshape(-1).astype(np.float32)
                norm = np.linalg.norm(vector)
                if norm == 0:
                    raise ValueError("The face model produced an empty embedding.")
                result["embedding"] = (vector / norm).tolist()
            print(json.dumps(result), flush=True)
        except Exception as error:
            fail(str(error))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        fail(str(error))
        sys.exit(1)
