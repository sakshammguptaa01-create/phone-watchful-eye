# Snitch Cam Review & Improvement Plan

## Current Assessment

The project is **functionally solid** for a Class 12 CBSE practical: it opens the webcam, runs a pretrained COCO-SSD object-detection model in the browser, draws bounding boxes, beeps on phone detection, logs violations, and exposes confidence/sensitivity sliders. The dark "surveillance" UI is polished and the landing page explains the tech stack well.

## Strengths

- No training required — uses COCO-SSD (MobileNet), a standard pretrained model.
- Privacy-friendly: all inference happens in the browser via TensorFlow.js/WebGL.
- Clean real-time controls: confidence threshold (20–90%) and sensitivity (1–10).
- Good explanation cards for the examiner: pretrained model, on-device inference, alert engine.
- Responsive layout and clear status indicators (CLEAR / VIOLATION / OFFLINE).

## Gaps / Risks for the Practical Exam

1. **Generic Lovable branding remains**
   - `src/routes/__root.tsx` still has title/description "Lovable App" / "Lovable Generated Project".
   - `README.md` is the default Lovable template, not a project report.

2. **No offline / no-camera fallback**
   - If the lab PC has no webcam or the examiner blocks camera permission, the demo dies immediately.

3. **Detection limitations are not surfaced**
   - Back covers, distance, and occlusion will reduce accuracy. The UI does not explain this or offer tips.
   - "remote" is included as a phone-like class, which can cause false positives.

4. **Missing project documentation**
   - A CBSE practical usually needs: objective, methodology, tech stack, algorithm, limitations, future scope, conclusion.
   - None of this is visible in the app or repo.

5. **GitHub repo not set up**
   - The user wants the examiner to see GitHub, not Lovable. The repo still needs to be connected and pushed.

## Proposed Improvements

1. **Fix branding metadata**
   - Update `src/routes/__root.tsx` head meta to "Snitch Cam" and a project-specific description.

2. **Rewrite `README.md` as a CBSE project report**
   - Include sections: Aim, Description, Tech Stack, Algorithm, Features, How to Run, Screenshots, Limitations, Future Scope, Conclusion.

3. **Add a "Project Report" section to the landing page**
   - Render the same content in-page so the examiner can read it without leaving the browser.

4. **Add a demo / test mode**
   - Provide a small set of sample images (phone in hand, no phone) that the model can run on when the camera is unavailable or for controlled testing.

5. **Improve detection guidance and reduce false positives**
   - Remove "remote" from the phone classes or make it optional.
   - Add an on-screen tip panel: ideal distance, lighting, angle.

6. **Connect and push to GitHub**
   - Use the Lovable GitHub integration to create a public repository with the cleaned README.

## Expected Outcome

A self-contained, examiner-friendly project that runs live, explains itself, survives missing hardware, and looks like a genuine student-built repo on GitHub.
