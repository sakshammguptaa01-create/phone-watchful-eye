# Deploying Snitch Cam

Snitch Cam is a TanStack Start (React 19 + Vite) app. All AI inference runs in the
browser with TensorFlow.js, so no backend services or API keys are required.

## Deploy to Vercel

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com) choose **Add New → Project** and import the repo.
3. Leave the defaults — `vercel.json` in this repo already sets:
   - Build command: `npm run build`
   - Build environment: `NITRO_PRESET=vercel` (tells the TanStack Start server build
     to emit a Vercel-compatible output)
4. Click **Deploy**.

That is it. Vercel serves the app over HTTPS, which the browser requires before it
will grant `getUserMedia` camera access.

### Deploying from the CLI

```bash
npm i -g vercel
vercel        # preview deployment
vercel --prod # production deployment
```

## Local development

```bash
npm install
npm run dev     # http://localhost:8080
npm run build   # production build
npm run preview # preview the production build
```

## Notes

- Camera access only works on `https://` origins or on `http://localhost`.
- The COCO-SSD model (~13 MB) is downloaded from the TensorFlow CDN on first load
  and then cached by the browser.
- Demo Mode (sample images + sample video in `public/demo/`) works without a camera.
