# Snitch Cam — AI Phone Usage Detection System

**Class 12 CBSE Computer Science Practical Project**

---

## 1. Aim

To build a browser-based AI invigilation system that detects when a person uses a mobile phone in front of a webcam and raises an instant audio-visual alert.

## 2. Description

Snitch Cam uses a pretrained deep-learning object-detection model (COCO-SSD with a MobileNet backbone) running entirely in the browser through TensorFlow.js. It watches the live camera feed, looks for objects classified as `cell phone`, draws a bounding box around any detection, and triggers a beep sound plus an optional desktop notification. All detections are timestamped in a violation log.

The system is deliberately simple to demonstrate:

- Real-time computer vision in the browser
- Privacy-preserving, on-device inference
- Immediate feedback loops (visual + audio + notification)
- A clean, responsive user interface

## 3. Tech Stack

| Layer         | Technology                                                 |
| ------------- | ---------------------------------------------------------- |
| Framework     | TanStack Start (React 19 + Vite)                           |
| Language      | TypeScript                                                 |
| Styling       | Tailwind CSS v4                                            |
| AI Model      | COCO-SSD (MobileNet) via `@tensorflow-models/coco-ssd`     |
| Runtime       | TensorFlow.js (`@tensorflow/tfjs`) with WebGL acceleration |
| Audio         | Web Audio API                                              |
| Notifications | Browser Notification API                                   |

## 4. Algorithm

```text
1. Request webcam permission and start the video stream.
2. Load the COCO-SSD model once (cached for the session).
3. For every animation frame:
   a. Run object detection on the current video frame.
   b. Keep only detections whose class is "cell phone" and score >= threshold.
   c. Require N consecutive phone frames before marking a violation (sensitivity control).
   d. On violation: beep, show alert banner, log timestamp and confidence.
   e. When the phone leaves the frame for N frames: close the violation and record duration.
4. Render bounding boxes, status, FPS and the violation log.
```

## 5. Features

- Live webcam monitoring with real-time bounding boxes
- Adjustable confidence threshold (20% – 90%)
- Adjustable detection sensitivity (consecutive frames required before alerting)
- Web Audio beep alert
- Optional desktop notification alert
- Violation log with timestamp, confidence and duration
- **Demo mode with static images and a prerecorded sample video** — works without a webcam
- Responsive, dark-themed surveillance UI
- Privacy-friendly: no video leaves the device

## 6. How to Run

```sh
# Install dependencies
bun install

# Start the development server
bun run dev

# Open the URL shown in the terminal.
# - Use "Start Surveillance" to run on the live webcam.
# - Use "Demo Mode" buttons to test with static images or a prerecorded sample video
#   if no webcam is available or camera permission is blocked.
```

To build for production:

```sh
bun run build
```

## 7. Limitations

- Detection accuracy depends on lighting, angle, distance and how clearly the phone is visible.
- Very bulky phone cases or objects that obscure the phone shape may reduce detection.
- Far-away phones may be too small in the frame to trigger the model.
- The model is pretrained on general COCO objects; it is not fine-tuned for exam-room conditions.

## 8. Future Scope

- Train a custom model on exam-room images for higher accuracy.
- Add face/attention detection to flag candidates looking down at hidden phones.
- Store violation logs on a backend with timestamps and photos.
- Support multiple camera feeds for classroom-wide monitoring.

## 9. Conclusion

Snitch Cam demonstrates how a pretrained neural network can be deployed directly in a web browser to solve a practical problem. It keeps data on the device, requires no model training, and provides immediate feedback — making it a strong fit for a Class 12 CBSE Computer Science capstone project.

---

_Submitted for AISSCE Class 12 Computer Science Practical Examination._
