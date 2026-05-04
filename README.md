# Mimicry: Emotion Arcade Mirror

Real-time emotion detection mirroring your feelings in a retro arcade UI. It morphs a pixel-art avatar and generates bouncing emoji particles based on your facial expressions.

## Features

* **Real-time Facial tracking:** Uses `face-api.js` directly in the browser for expression monitoring.
* **Retro Arcade UI:** Built with custom typography, glowing borders, and a cyberpunk neon color palette.
* **Pixel Avatar:** An interactive ASCII-style face that transforms to match your detected emotion (Happy, Sad, Angry, Surprised, Neutral).
* **Particle Physics:** Bouncing emoji particles dynamically react to emotional changes using custom Canvas/DOM physics.
* **Privacy First:** All ML processing happens locally in your browser. No images or camera feeds are sent to any server.

## Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** Tailwind CSS, custom CSS animations
* **Machine Learning:** `face-api.js` (tinyFaceDetector & faceExpressionNet)
* **Camera Handling:** `react-webcam`
* **Animations:** Motion (`motion/react`)

## Getting Started

### Prerequisites

Ensure you have Node.js and npm installed on your machine.

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000` (or the port specified by Vite).

### Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory. You can then serve this directory using a static file server.
