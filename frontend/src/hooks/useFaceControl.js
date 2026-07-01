import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// MediaPipe WASM + model are fetched from CDNs at runtime (works on static
// hosting like GitHub Pages). All processing happens in-browser — the webcam
// video never leaves the device.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const NOSE_TIP = 1; // face-mesh landmark index for the nose tip

/**
 * Hands-free pointer: head movement drives a screen cursor, a blink taps.
 *
 * @param enabled        turn the whole system on/off
 * @param videoRef       ref to a <video> element (hidden or preview)
 * @param cursorRef      ref to the floating cursor <div>
 * @param sensitivityRef ref holding a number (head-move gain), read live
 * @param blinkRef       ref holding the blink threshold 0..1, read live
 * @param onState        callback for React UI state (throttled)
 */
export function useFaceControl({
  enabled,
  videoRef,
  cursorRef,
  sensitivityRef,
  blinkRef,
  onState,
}) {
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const cursor = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const targetPos = useRef({ x: cursor.current.x, y: cursor.current.y });
  const eye = useRef({ closed: false, closeStart: 0, lastClick: 0 });
  const lastEmit = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    runningRef.current = true;

    async function start() {
      try {
        onState?.({ status: "loading" });
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        if (cancelled) return landmarker.close();
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        onState?.({ status: "active", face: false });
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        onState?.({ status: "error", error: friendlyError(err) });
      }
    }

    function loop() {
      if (!runningRef.current) return;
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && landmarker && video.readyState >= 2) {
        const now = performance.now();
        let result;
        try {
          result = landmarker.detectForVideo(video, now);
        } catch {
          /* transient frame error */
        }
        const face = result?.faceLandmarks?.[0];
        if (face) {
          const gain = sensitivityRef.current || 3.5;
          const nose = face[NOSE_TIP];
          // Mirror X so moving your head right moves the cursor right.
          let nx = 0.5 - (nose.x - 0.5) * gain;
          let ny = 0.5 + (nose.y - 0.5) * gain;
          nx = clamp01(nx);
          ny = clamp01(ny);
          targetPos.current.x = nx * window.innerWidth;
          targetPos.current.y = ny * window.innerHeight;

          const cats = result.faceBlendshapes?.[0]?.categories || [];
          const bl = score(cats, "eyeBlinkLeft");
          const br = score(cats, "eyeBlinkRight");
          const closedScore = (bl + br) / 2;
          handleBlink(closedScore, now);

          if (now - lastEmit.current > 90) {
            lastEmit.current = now;
            onState?.({ status: "active", face: true, closedScore });
          }
        } else if (now - lastEmit.current > 200) {
          lastEmit.current = now;
          onState?.({ status: "active", face: false });
        }
      }

      // Smooth the cursor toward its target.
      cursor.current.x += (targetPos.current.x - cursor.current.x) * 0.3;
      cursor.current.y += (targetPos.current.y - cursor.current.y) * 0.3;
      const el = cursorRef.current;
      if (el) {
        el.style.transform = `translate(${cursor.current.x}px, ${cursor.current.y}px) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    function handleBlink(closedScore, now) {
      const threshold = blinkRef.current || 0.5;
      const e = eye.current;
      const isClosed = closedScore > threshold;
      if (isClosed && !e.closed) {
        e.closed = true;
        e.closeStart = now;
      } else if (!isClosed && e.closed) {
        e.closed = false;
        const dur = now - e.closeStart;
        // Deliberate blink: eyes shut 130–900ms, debounced 700ms between taps.
        if (dur >= 130 && dur <= 900 && now - e.lastClick > 700) {
          e.lastClick = now;
          triggerClick(now);
        }
      }
    }

    function triggerClick(now) {
      const x = cursor.current.x;
      const y = cursor.current.y;
      const el = document.elementFromPoint(x, y);
      if (el) {
        const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y };
        el.dispatchEvent(new MouseEvent("mousedown", opts));
        el.dispatchEvent(new MouseEvent("mouseup", opts));
        if (typeof el.click === "function") el.click();
        const tag = el.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          el.focus();
        }
      }
      const c = cursorRef.current;
      if (c) {
        c.classList.add("clicking");
        setTimeout(() => c.classList.remove("clicking"), 260);
      }
      onState?.({ clickPulse: now });
    }

    start();
    return () => {
      cancelled = true;
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
      onState?.({ status: "off" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const score = (cats, name) => cats.find((c) => c.categoryName === name)?.score || 0;

function friendlyError(err) {
  const msg = err?.name || err?.message || String(err);
  if (/NotAllowed|Permission/i.test(msg)) return "Camera permission denied.";
  if (/NotFound|Devices/i.test(msg)) return "No camera found.";
  if (/NotReadable|Track/i.test(msg)) return "Camera is in use by another app.";
  return "Could not start face control. " + msg;
}
