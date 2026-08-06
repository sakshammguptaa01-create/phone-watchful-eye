import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SnitchCam = lazy(() => import("@/components/SnitchCam"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Snitch Cam — AI Phone Usage Detection System" },
      {
        name: "description",
        content:
          "Snitch Cam is a Class 12 CBSE capstone project that uses a pretrained AI vision model to detect mobile phone usage on a live camera feed and raise instant beep alerts.",
      },
      { property: "og:title", content: "Snitch Cam — AI Phone Usage Detection System" },
      {
        property: "og:description",
        content:
          "Real-time phone-usage detection with a pretrained object detection model, live alerts and a violation log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-grid">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10">
          <p className="font-mono text-xs tracking-[0.35em] text-primary uppercase">
            Class 12 CBSE · Capstone Project
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            Snitch<span className="text-primary">Cam</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            An AI-powered invigilation system. It watches a live camera feed with a{" "}
            <span className="text-foreground">pretrained deep-learning object detector</span> and
            stays completely silent while nobody is on their phone. The moment a mobile phone
            appears in frame, it beeps, flashes an alert and records the violation.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-12 text-center font-mono text-sm text-muted-foreground">
              Booting detection engine…
            </div>
          }
        >
          <ClientOnly
            fallback={
              <div className="rounded-2xl border border-border bg-card p-12 text-center font-mono text-sm text-muted-foreground">
                Booting detection engine…
              </div>
            }
          >
            <SnitchCam />
          </ClientOnly>
        </Suspense>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Pretrained Model",
              d: "Uses COCO-SSD (MobileNet backbone) trained on the 330k-image COCO dataset — no training required, it already knows the 'cell phone' class.",
            },
            {
              t: "On-Device Inference",
              d: "TensorFlow.js runs the neural network in the browser using WebGL. No video ever leaves the device, so privacy is preserved.",
            },
            {
              t: "Alert Engine",
              d: "Web Audio API generates a two-tone beep and the Notification API raises a desktop alert, throttled to one beep per second.",
            },
          ].map((c) => (
            <article key={c.t} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold text-primary">{c.t}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.d}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
            How it works
          </h2>
          <ol className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li>
              <span className="text-foreground">1. Capture —</span> getUserMedia() streams webcam
              frames into a &lt;video&gt; element.
            </li>
            <li>
              <span className="text-foreground">2. Detect —</span> each frame is passed to the
              COCO-SSD model, returning bounding boxes with class labels and confidence scores.
            </li>
            <li>
              <span className="text-foreground">3. Filter —</span> only detections of class
              &quot;cell phone&quot; above 50% confidence count as a violation.
            </li>
            <li>
              <span className="text-foreground">4. Alert &amp; Log —</span> a beep plus notification
              fires, the box is drawn on a canvas overlay, and the event is timestamped in the log.
            </li>
          </ol>
        </section>

        <footer className="mt-10 border-t border-border pt-6 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Snitch Cam · Computer Science Practical · AISSCE
        </footer>
      </div>
    </main>
  );
}
