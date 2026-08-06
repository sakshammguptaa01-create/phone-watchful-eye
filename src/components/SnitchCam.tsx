import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

type LogEntry = { id: number; time: string; score: number; duration?: number };

const PHONE_CLASSES = ["cell phone", "remote"];

export default function SnitchCam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef(0);
  const violationStartRef = useRef<number | null>(null);
  const logIdRef = useRef(0);

  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [message, setMessage] = useState("Model not loaded");
  const [detected, setDetected] = useState(false);
  const [score, setScore] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [notifyOn, setNotifyOn] = useState(false);
  const [fps, setFps] = useState(0);

  const beep = useCallback(() => {
    if (!soundOn) return;
    const now = Date.now();
    if (now - lastBeepRef.current < 900) return;
    lastBeepRef.current = now;
    try {
      const ctx =
        audioRef.current ??
        new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      /* audio unavailable */
    }
  }, [soundOn]);

  const notify = useCallback(() => {
    if (!notifyOn || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification("Snitch Cam Alert", {
        body: "Phone usage detected in frame.",
        tag: "snitch-cam",
      });
    } catch {
      /* notifications unavailable */
    }
  }, [notifyOn]);

  const requestNotify = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifyOn(perm === "granted");
  };

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    violationStartRef.current = null;
    setDetected(false);
    setStatus("idle");
    setMessage("Surveillance stopped");
  }, []);

  const start = useCallback(async () => {
    try {
      setStatus("loading");
      setMessage("Requesting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!modelRef.current) {
        setMessage("Loading pretrained detection model…");
        await tf.ready();
        modelRef.current = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      }

      setStatus("running");
      setMessage("Monitoring live feed");

      let last = performance.now();
      let frames = 0;

      const loop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const model = modelRef.current;
        if (!video || !canvas || !model || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(() => void loop());
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const preds = await model.detect(video);

        const phones = preds.filter(
          (p) => PHONE_CLASSES.includes(p.class) && p.score >= CONFIDENCE,
        );
        const best = phones.sort((a, b) => b.score - a.score)[0];

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 3;
          ctx.font = "600 16px ui-sans-serif, system-ui";
          for (const p of phones) {
            const [x, y, w, h] = p.bbox;
            ctx.strokeStyle = "rgb(255,80,80)";
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = "rgba(255,80,80,0.85)";
            ctx.fillRect(x, y - 22, ctx.measureText(p.class).width + 60, 22);
            ctx.fillStyle = "#fff";
            ctx.fillText(`${p.class} ${(p.score * 100).toFixed(0)}%`, x + 6, y - 6);
          }
        }

        if (best) {
          if (violationStartRef.current === null) {
            violationStartRef.current = Date.now();
            notify();
            setLogs((l) =>
              [
                {
                  id: ++logIdRef.current,
                  time: new Date().toLocaleTimeString(),
                  score: best.score,
                },
                ...l,
              ].slice(0, 40),
            );
          }
          setDetected(true);
          setScore(best.score);
          beep();
        } else if (violationStartRef.current !== null) {
          const dur = (Date.now() - violationStartRef.current) / 1000;
          const id = logIdRef.current;
          violationStartRef.current = null;
          setLogs((l) => l.map((e) => (e.id === id ? { ...e, duration: dur } : e)));
          setDetected(false);
          setScore(0);
        }

        frames++;
        const now = performance.now();
        if (now - last > 1000) {
          setFps(Math.round((frames * 1000) / (now - last)));
          frames = 0;
          last = now;
        }

        rafRef.current = requestAnimationFrame(() => void loop());
      };

      rafRef.current = requestAnimationFrame(() => void loop());
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Could not start camera");
    }
  }, [beep, notify]);

  useEffect(() => () => stop(), [stop]);

  const violations = logs.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <section
        className={`relative overflow-hidden rounded-2xl border-2 bg-card shadow-panel transition-colors ${
          detected ? "border-destructive animate-alert" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                status === "running" ? "bg-destructive animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Cam 01 · Live Feed
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{fps} FPS</span>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 size-full object-cover"
          />
          <canvas ref={canvasRef} className="absolute inset-0 size-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-scanlines opacity-30" />

          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
              <p className="font-mono text-sm tracking-widest text-muted-foreground uppercase">
                {status === "loading" ? "Initialising" : status === "error" ? "Error" : "Standby"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {detected && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-destructive px-4 py-1.5 font-mono text-xs font-bold tracking-widest text-destructive-foreground uppercase">
              ⚠ Phone Usage Detected
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          {status === "running" ? (
            <button onClick={stop} className="btn-danger">
              Stop Monitoring
            </button>
          ) : (
            <button onClick={() => void start()} disabled={status === "loading"} className="btn-primary">
              {status === "loading" ? "Loading…" : "Start Monitoring"}
            </button>
          )}
          <button
            onClick={() => setSoundOn((s) => !s)}
            className={soundOn ? "btn-ghost-on" : "btn-ghost"}
          >
            {soundOn ? "🔊 Beep On" : "🔇 Beep Off"}
          </button>
          <button
            onClick={() => void requestNotify()}
            className={notifyOn ? "btn-ghost-on" : "btn-ghost"}
          >
            {notifyOn ? "🔔 Notifications On" : "🔕 Enable Notifications"}
          </button>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Status
            </p>
            <p
              className={`mt-1 text-lg font-bold ${detected ? "text-destructive" : "text-accent"}`}
            >
              {detected ? "VIOLATION" : status === "running" ? "CLEAR" : "OFFLINE"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Confidence
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {(score * 100).toFixed(0)}%
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Total Violations
            </p>
            <p className="mt-1 text-3xl font-black text-destructive">{violations}</p>
          </div>
        </div>

        <div className="flex min-h-64 flex-1 flex-col rounded-xl border border-border bg-card">
          <p className="border-b border-border/70 px-4 py-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Violation Log
          </p>
          <ul className="flex-1 overflow-y-auto p-2 font-mono text-xs">
            {logs.length === 0 && (
              <li className="p-3 text-muted-foreground">No violations recorded.</li>
            )}
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-secondary/40"
              >
                <span className="text-foreground">{l.time}</span>
                <span className="text-muted-foreground">
                  {(l.score * 100).toFixed(0)}%
                  {l.duration ? ` · ${l.duration.toFixed(1)}s` : " · ongoing"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
