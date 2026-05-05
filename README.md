# Mimicry: Emotion Arcade Mirror

Real-time facial emotion detection wrapped in a retro arcade UI. Point your camera at your face and watch a pixel avatar mirror your expressions while bouncing emoji particles fill the screen.

## Features

* **Real-time Emotion Detection:** Runs `face-api.js` (tinyFaceDetector + faceExpressionNet) entirely in the browser — detects Happy, Sad, Angry, Surprised, and Neutral.
* **Mock Mode Fallback:** If the face-api models fail to load from CDN, the app automatically cycles through emotions in demo mode so the UI still works.
* **ASCII Pixel Avatar:** An animated canvas face (`^ _ ^`, `> _ <`, `O _ O`, etc.) that morphs to match the detected emotion, with a subtle float/bob animation between frames.
* **Particle Physics Engine:** Emoji particles spawn on every emotion change, bounce off walls and floor with friction, and fade out slowly. Angry particles trigger a special burst-and-explode mechanic.
* **Retro Audio System:** Web Audio API synthesiser plays distinct chip-tune sounds for camera start/stop, emotion changes, particle–wall collisions, and angry bursts.
* **Live Emotion Score Bars:** A sidebar shows all five emotion confidence scores updating in real time with animated progress bars.
* **Privacy First:** All ML inference runs locally in your browser. No frames, images, or data are ever sent to a server.
* **Neon Retro Aesthetic:** Custom pixel font, neon green (`#dcf310f5`) glow effects, pixel-shadow buttons, and a dark cyberpunk colour palette.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, custom CSS (neon glow, pixel shadows) |
| Machine Learning | `@vladmandic/face-api` (tinyFaceDetector, faceExpressionNet) |
| Camera | `react-webcam` |
| Animations | Motion (`motion/react`) |
| Audio | Web Audio API (custom `RetroAudio` class) |

## Getting Started

### Prerequisites

Node.js and npm installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eloi-web/Mimicry.git
   cd Mimicry
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

> **Note:** Camera access requires HTTPS or `localhost`. The app will show an "ACCESS DENIED" state if permission is blocked.

### Building for Production

```bash
npm run build
```

Output goes to the `dist/` directory.
