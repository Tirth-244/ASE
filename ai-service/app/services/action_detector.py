# =============================================================================
# Action Detector Service
# =============================================================================
# Uses YOLOv8 to detect sports-related objects and actions in video frames.
# =============================================================================

import asyncio
from typing import List, Dict, Any
from loguru import logger


# Sports-relevant COCO class labels
SPORTS_CLASSES = {
    0: "person",
    32: "sports ball",
    # We'll also look for celebrations, crowds via person detection density
}

# Custom labels mapped from detections
ACTION_MAPPING = {
    "dense_people": "CROWD_REACTION",
    "sports_ball_person": "SKILL",
    "celebration_pose": "CELEBRATION",
}


async def detect_actions(
    frame_paths: List[str],
    video_path: str,
) -> List[Dict[str, Any]]:
    """
    Detects sports actions in extracted video frames using YOLOv8.

    Analyzes each frame for:
    - People (players, crowd density)
    - Sports ball presence
    - Action inference based on spatial relationships

    Args:
        frame_paths: List of paths to extracted frame images.
        video_path: Path to the source video (for timestamp calculation).

    Returns:
        List of frame detections with actions, confidence, and bounding boxes.
    """
    return await asyncio.to_thread(_detect_actions_sync, frame_paths, video_path)


def _detect_actions_sync(
    frame_paths: List[str],
    video_path: str,
) -> List[Dict[str, Any]]:
    """Synchronous action detection implementation."""
    try:
        from ultralytics import YOLO
        import cv2

        # Load YOLOv8 nano model (fast, lightweight)
        logger.info("Loading YOLOv8 model...")
        model = YOLO("yolov8n.pt")

        detections = []

        # Get video FPS for timestamp calculation
        fps = _get_video_fps(video_path)

        for i, frame_path in enumerate(frame_paths):
            try:
                # Run inference
                results = model(frame_path, verbose=False, conf=0.3)

                frame_actions = []
                person_count = 0
                has_ball = False

                for result in results:
                    for box in result.boxes:
                        cls_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        bbox = box.xyxy[0].tolist()
                        label = model.names[cls_id]

                        if cls_id == 0:  # person
                            person_count += 1

                        if cls_id == 32:  # sports ball
                            has_ball = True
                            frame_actions.append({
                                "label": "SKILL",
                                "confidence": confidence,
                                "bbox": [round(x, 1) for x in bbox],
                            })

                # Infer crowd reaction from person density
                if person_count >= 8:
                    frame_actions.append({
                        "label": "CROWD_REACTION",
                        "confidence": min(person_count / 15.0, 0.95),
                        "bbox": [0, 0, 0, 0],
                    })

                # Infer celebration from people grouping
                if person_count >= 3 and person_count <= 7 and has_ball:
                    frame_actions.append({
                        "label": "CELEBRATION",
                        "confidence": 0.6,
                        "bbox": [0, 0, 0, 0],
                    })

                # Calculate timestamp from frame index
                timestamp = i * 2.0  # Frames extracted every 2 seconds

                if frame_actions:
                    detections.append({
                        "frame_index": i,
                        "timestamp": round(timestamp, 2),
                        "actions": frame_actions,
                    })

            except Exception as e:
                logger.warning(f"Error processing frame {i}: {e}")
                continue

        logger.info(f"Action detection complete: {len(detections)} frames with actions")
        return detections

    except ImportError:
        logger.warning("YOLO not available, returning empty detections")
        return []
    except Exception as e:
        logger.error(f"Action detection error: {e}")
        return []


def _get_video_fps(video_path: str) -> float:
    """Gets the video FPS using OpenCV."""
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        cap.release()
        return fps
    except Exception:
        return 30.0
