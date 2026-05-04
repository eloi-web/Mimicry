import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { motion } from 'motion/react';

// --- Constants & Types ---
const EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'neutral'] as const;
type Emotion = typeof EMOTIONS[number];
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

const EMOTION_ICONS: Record<Emotion, string> = {
  happy: 'sentiment_very_satisfied',
  sad: 'sentiment_dissatisfied',
  angry: 'sentiment_extremely_dissatisfied',
  surprised: 'sentiment_neutral',
  neutral: 'sentiment_satisfied',
};

const EMOTION_EMOJIS: Record<Emotion, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  neutral: '😐',
};

// --- Hooks ---

// 1. Emotion Detection
const useEmotionDetection = (
  webcamRef: React.RefObject<Webcam | null>,
  cameraActive: boolean
) => {
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [scores, setScores] = useState<Record<Emotion, number>>({
    happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 100
  });
  const [isModelReady, setIsModelReady] = useState(false);
  const [useMock, setUseMock] = useState(false);
  
  // Load models
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        if (mounted) setIsModelReady(true);
      } catch (err) {
        console.warn('Failed to load FaceAPI models, falling back to mock.', err);
        if (mounted) setUseMock(true);
      }
    };
    loadModels();
    return () => { mounted = false; };
  }, []);

  // Detection Loop
  useEffect(() => {
    if (!cameraActive) return;

    if (useMock) {
      // Mock mode
      let idx = 0;
      const interval = setInterval(() => {
        const nextEmo = EMOTIONS[idx % EMOTIONS.length];
        setEmotion(nextEmo);
        setScores({
          happy: nextEmo === 'happy' ? 95 : 5,
          sad: nextEmo === 'sad' ? 95 : 5,
          angry: nextEmo === 'angry' ? 95 : 5,
          surprised: nextEmo === 'surprised' ? 95 : 5,
          neutral: nextEmo === 'neutral' ? 95 : 5,
        });
        idx++;
      }, 3000);
      return () => clearInterval(interval);
    }

    if (!isModelReady) return;

    // Real FaceAPI mode
    let rAF: number;
    const detect = async () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detections = await faceapi.detectSingleFace(video, options).withFaceExpressions();
        
        if (detections) {
          const expressions = detections.expressions;
          let topEmotion = 'neutral' as Emotion;
          let maxScore = 0;
          for (const [emo, score] of Object.entries(expressions)) {
            if (EMOTIONS.includes(emo as Emotion) && score > maxScore) {
              maxScore = score;
              topEmotion = emo as Emotion;
            }
          }
          
          setEmotion(topEmotion);
          setScores({
            happy: Math.round((expressions.happy || 0) * 100),
            sad: Math.round((expressions.sad || 0) * 100),
            angry: Math.round((expressions.angry || 0) * 100),
            surprised: Math.round((expressions.surprised || 0) * 100),
            neutral: Math.round((expressions.neutral || 0) * 100),
          });
        }
      }
      rAF = requestAnimationFrame(detect);
    };
    
    detect();
    return () => cancelAnimationFrame(rAF);
  }, [cameraActive, isModelReady, useMock, webcamRef]);

  return { emotion, scores, isModelReady, useMock };
};

// --- Components ---

// Morphing Avatar (Pixel Face)
const MorphingAvatar = ({ emotion }: { emotion: Emotion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw base pixel grid text
    ctx.fillStyle = '#39FF14'; // Neon Green
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "CustomFontPlaceholder", "Space Grotesk", sans-serif';
    ctx.shadowColor = '#39FF14';
    ctx.shadowBlur = 15;

    let faceStr = '– _ –';
    switch (emotion) {
      case 'happy': faceStr = '^ _ ^'; break;
      case 'sad': faceStr = 'O ﹏ O'; break;
      case 'angry': faceStr = '> _ <'; break;
      case 'surprised': faceStr = 'O _ O'; break;
      case 'neutral': faceStr = '– _ –'; break;
    }

    ctx.fillText(faceStr, canvas.width / 2, canvas.height / 2);
    
    // Cleanup shadow
    ctx.shadowBlur = 0;
  }, [emotion]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="retro-border border-[#39FF14] bg-neutral-900/80 w-64 h-32 flex items-center justify-center p-2 relative shadow-[0_0_15px_rgba(57,255,20,0.2)]">
        <canvas ref={canvasRef} width={240} height={110} />
      </div>
      <span className="text-[#39FF14] text-xs font-bold tracking-widest uppercase">
        SUBJECT STATUS: {emotion}
      </span>
    </div>
  );
};

// Emotion Card
const EmotionCard: React.FC<{ name: Emotion; icon: string; value: number; active: boolean }> = ({ name, icon, value, active }) => {
  return (
    <div className={`transition-all duration-300 p-3 bg-surface/80 backdrop-blur-sm 
        ${active ? 'retro-border neon-green-glow pixel-shadow-active' : 'border-2 border-outline opacity-70 hover:opacity-100'}
      `}
    >
      <div className="flex flex-col w-full gap-2">
        <div className="flex items-center justify-between w-full">
          <span className="font-body-lg text-[18px] uppercase font-bold tracking-wider">
            [ {name} ]
          </span>
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <div className="h-2 w-full bg-white/10 relative overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }} 
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`absolute top-0 left-0 h-full ${active ? 'neon-green-bg-glow' : 'bg-white/40'}`} 
          />
        </div>
      </div>
    </div>
  );
};

// Bouncing Emotions for Mobile
const BouncingEmotions = ({ currentEmotion }: { currentEmotion: Emotion }) => {
  const [particles, setParticles] = useState<{id: number, e: Emotion, x: number, y: number, vx: number, vy: number, life: number}[]>([]);
  
  // Add particle on emotion change
  useEffect(() => {
    const newParticle = {
      id: Date.now() + Math.random(),
      e: currentEmotion,
      x: 30 + Math.random() * (window.innerWidth - 60), // Random X position
      y: window.innerHeight - 80, // Start lower down
      vx: (Math.random() - 0.5) * 12, // light horizontal scatter
      vy: -15 - Math.random() * 8, // shoot up
      life: 1.0, 
    };
    setParticles(p => [...p, newParticle].slice(-25)); // max 25 to crowd them
  }, [currentEmotion]);

  useEffect(() => {
    let rAF: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 2);
      lastTime = time;

      setParticles(prev => prev.map(p => {
         let { x, y, vx, vy, life } = p;

         vy += 0.8 * dt; // gravity
         x += vx * dt;
         y += vy * dt;

         const h = window.innerHeight;
         const w = window.innerWidth;
         const size = 60; 

         // Floor collision
         if (y > h - size) {
           y = h - size;
           vy *= -0.5; // bounce
           vx *= 0.8;  // friction
         }
         
         // Wall collision
         if (x < 0) { x = 0; vx *= -0.6; }
         else if (x > w - size) { x = w - size; vx *= -0.6; }

         life -= 0.001 * dt; // fade extremely slowly so they pile up

         return { ...p, x, y, vx, vy, life };
      }).filter(p => p.life > 0)); 

      rAF = requestAnimationFrame(loop);
    };
    rAF = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rAF);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden md:hidden">
      {particles.map(p => (
         <div
           key={p.id}
           className="absolute text-5xl transition-opacity duration-75"
           style={{
             transform: `translate(${p.x}px, ${p.y}px)`,
             opacity: Math.min(p.life * 2, 1), // stay opaque longer
             filter: `drop-shadow(0 -5px 15px rgba(57,255,20, ${Math.min(p.life * 1.5, 0.9)}))` // green overlay glow
           }}
         >
           {EMOTION_EMOJIS[p.e]}
         </div>
      ))}
    </div>
  );
};

// Main App component
export default function App() {
  const [cameraActive, setCameraActive] = useState(false);
  const [denied, setDenied] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  
  const { emotion, scores, isModelReady, useMock } = useEmotionDetection(webcamRef, cameraActive);

  const handleStartCamera = () => {
    setCameraActive(true);
  };

  return (
    <div className="bg-background text-on-background min-h-screen relative overflow-hidden font-body-md text-body-md dark selection:bg-[#39FF14] selection:text-black">
      {/* TopNavBar */}
      <nav className="relative z-50 flex justify-between items-center px-4 md:px-6 py-4 font-body-lg uppercase tracking-widest pointer-events-none">
        <div className="text-xl md:text-2xl font-black text-white hover:text-[#39FF14] transition-colors drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-black/60 backdrop-blur-md px-3 py-1 border border-white/10 pointer-events-auto">
          EMOTION <span className="text-[#39FF14]">MIRROR</span>
        </div>
        <div className="flex gap-4 items-center pointer-events-auto">
          <button className="text-white hover:text-[#39FF14] transition-colors p-2 cursor-pointer bg-black/60 backdrop-blur-md border border-white/10">
            <span className="material-symbols-outlined">code</span>
          </button>
        </div>
      </nav>

      {/* Main Layout Area */}
      <div className="relative z-10 flex flex-col md:flex-row w-full h-[calc(100vh-70px)] pt-4 pb-4 px-4 gap-4">
        
        {/* Empty State / Not Started */}
        {!cameraActive && (
          <div className="absolute inset-0 z-50 bg-neutral-900 flex flex-col items-center justify-center text-center">
            <div className="z-10 flex flex-col items-center gap-6 p-8 border border-white/10 bg-black/50 backdrop-blur-xl">
              <span className={`material-symbols-outlined text-8xl ${denied ? 'text-red-500' : 'text-white'}`}>
                {denied ? 'error' : 'videocam_off'}
              </span>
              <div className="flex flex-col items-center gap-2">
                <span className={`font-headline-md text-headline-md animate-pulse uppercase tracking-widest ${denied ? 'text-red-500' : 'text-white'}`}>
                  {denied ? 'ACCESS DENIED' : 'SIGNAL LOST'}
                </span>
                <p className="text-neutral-400 text-sm max-w-sm">
                  {denied ? 'Camera permission was denied. Please allow access in your browser settings to continue.' : 'System requires visual input to analyze affective states.'}
                </p>
              </div>
              {!denied && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  onClick={handleStartCamera}
                  className="mt-6 px-8 py-4 retro-border text-white hover:bg-[#39FF14] hover:border-[#39FF14] hover:text-black transition-colors uppercase font-label-caps tracking-widest pixel-shadow hover:pixel-shadow-active cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                >
                  ENABLE CAMERA TO CONTINUE
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Left Column: Emotion Cards */}
        <div className="hidden md:flex w-64 flex-col gap-3 shrink-0 h-full overflow-y-auto scroll-none pr-2 relative z-20">
            {EMOTIONS.map(emo => (
              <EmotionCard 
                key={emo} 
                name={emo} 
                icon={EMOTION_ICONS[emo]} 
                value={scores[emo]} 
                active={emotion === emo} 
              />
            ))}
        </div>

        {/* Center Canvas / Webcam Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[40vh] md:min-h-0 border border-white/10 bg-black max-w-4xl mx-auto w-full z-10 overflow-hidden">
             {/* Bouncing Faces for Mobile */}
             {cameraActive && <BouncingEmotions currentEmotion={emotion} />}

             {cameraActive && (
               <Webcam
                 ref={webcamRef}
                 audio={false}
                 className="w-full h-full object-cover"
                 onUserMediaError={() => { setDenied(true); setCameraActive(false); }}
                 mirrored={true} // standard for mirrors
               />
             )}
             
             {/* HUD Overlay inside Camera */}
             {cameraActive && (
                 <div className="absolute top-4 left-4 border border-[#39FF14]/50 bg-black/60 px-3 py-1 backdrop-blur-sm pointer-events-none">
                   <span className="text-[#39FF14] text-xs font-bold animate-pulse">REC ●</span>
                 </div>
             )}

             {/* Morphing Avatar positioned at bottom center over camera */}
             {cameraActive && (
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                  <MorphingAvatar emotion={emotion} />
               </div>
             )}
        </div>



      </div>
    </div>
  );
}
