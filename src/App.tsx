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

// --- Audio System ---
class RetroAudio {
  ctx: AudioContext | null = null;
  
  init() {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!this.ctx && AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCameraStart() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'square';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } catch(e) {}
  }

  playCameraStop() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'square';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } catch(e) {}
  }

  playEmotionChange(emotion: string) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      const freqs: Record<string, number> = {
        happy: 800,
        sad: 300,
        angry: 150,
        surprised: 1200,
        neutral: 400
      };
      const freq = freqs[emotion] || 400;
      
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq * 0.8, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.1);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch(e) {}
  }

  playBurst() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } catch(e) {}
  }

  playCollision() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'square';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } catch(e) {}
  }
}

export const retroAudio = new RetroAudio();

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
    if (cameraActive) {
      retroAudio.playEmotionChange(emotion);
    }
  }, [emotion, cameraActive]);

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
    let isDetecting = false;
    const detect = async () => {
      if (!isDetecting && webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          isDetecting = true;
          try {
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
          } catch (e) {
             console.warn("Face detection error:", e);
          } finally {
             isDetecting = false;
          }
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
  const emotionRef = useRef<Emotion>(emotion);

  // Sync emotion prop to ref for the animation loop
  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rAF: number;
    let blinkTimer = 0;
    let isBlinking = false;
    let time = 0;

    const render = () => {
      // Accumulate time for sinusoidal movements
      time += 0.05;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw base pixel grid text
      ctx.fillStyle = '#39FF14'; // Neon Green
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px "CustomFontPlaceholder", "Space Grotesk", sans-serif';
      ctx.shadowColor = '#39FF14';
      ctx.shadowBlur = 15;

      // Handle randomized blinking logic
      blinkTimer++;
      if (!isBlinking && blinkTimer > 150 + Math.random() * 100) {
         isBlinking = true;
         blinkTimer = 0;
      } else if (isBlinking && blinkTimer > 8) {
         isBlinking = false;
         blinkTimer = 0;
      }

      let faceStr = '– _ –';
      
      if (isBlinking) {
         faceStr = '– _ –'; // universal blink
      } else {
         switch (emotionRef.current) {
           case 'happy': faceStr = '^ _ ^'; break;
           case 'sad': faceStr = 'O ﹏ O'; break;
           case 'angry': faceStr = '> _ <'; break;
           case 'surprised': faceStr = 'O _ O'; break;
           case 'neutral': faceStr = '– _ –'; break;
         }
      }

      // Subtle float/bob movement (Lissajous-style curve for head tracking feel)
      const bobY = Math.sin(time) * 4;
      const swayX = Math.cos(time * 0.5) * 3;

      ctx.fillText(faceStr, canvas.width / 2 + swayX, canvas.height / 2 + bobY);
      
      // Cleanup shadow
      ctx.shadowBlur = 0;

      rAF = requestAnimationFrame(render);
    };

    rAF = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rAF);
  }, []); // Run loop once, use ref for state updates

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
  const [particles, setParticles] = useState<{id: number, e: Emotion, x: number, y: number, vx: number, vy: number, life: number, collisionScale: number, isBursting?: boolean}[]>([]);
  
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
      collisionScale: 1.0,
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
         let { x, y, vx, vy, life, collisionScale, e, isBursting } = p;

         vy += 0.8 * dt; // gravity
         x += vx * dt;
         y += vy * dt;

         const h = window.innerHeight;
         const w = window.innerWidth;
         const size = 60; 

         // Floor collision
         if (y > h - size && !isBursting) {
           y = h - size;
           if (vy > 2) {
               collisionScale = 1.4; // scale up on hit
               retroAudio.playCollision();
           }
           vy *= -0.5; // bounce
           vx *= 0.8;  // friction
         }
         
         // Wall collision
         if (!isBursting) {
             if (x < 0) { 
                 x = 0; 
                 if (Math.abs(vx) > 2) {
                     collisionScale = 1.3;
                     retroAudio.playCollision();
                 }
                 vx *= -0.6; 
             } else if (x > w - size) { 
                 x = w - size; 
                 if (Math.abs(vx) > 2) {
                     collisionScale = 1.3;
                     retroAudio.playCollision();
                 }
                 vx *= -0.6; 
             }
         }

         // Angry burst mechanic
         if (e === 'angry' && vy > -2 && vy < 2 && !isBursting && y < h * 0.7) {
             isBursting = true;
             vx = 0;
             vy = 0;
             retroAudio.playBurst();
         }

         if (isBursting) {
             collisionScale += 0.2 * dt;
             life -= 0.05 * dt;
         } else {
             life -= 0.002 * dt; // fade extremely slowly so they pile up, slightly faster than before to make shrink noticeable
             collisionScale = 1.0 + (collisionScale - 1.0) * 0.85; // smoothly return to 1
         }

         return { ...p, x, y, vx, vy, life, collisionScale, isBursting };
      }).filter(p => p.life > 0)); 

      rAF = requestAnimationFrame(loop);
    };
    rAF = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rAF);
  }, []);

  const EMOTION_COLORS: Record<Emotion, string> = {
    neutral: '211,211,211',
    happy: '57,255,20', // neon green
    sad: '0,191,255', // deep sky blue
    angry: '255,69,0', // red-orange
    surprised: '255,105,180' // hot pink
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map(p => {
        const color = EMOTION_COLORS[p.e];
        const scale = Math.max(0.2, p.life) * p.collisionScale;
        
        return (
          <div
            key={p.id}
            className="absolute text-5xl transition-opacity duration-75"
            style={{
              transform: `translate(${p.x}px, ${p.y}px) scale(${scale})`,
              opacity: Math.min(p.life * 2, 1), // stay opaque longer
              filter: `drop-shadow(0 -5px 15px rgba(${color}, ${Math.min(p.life * 1.5, 0.9)}))`
            }}
          >
            {EMOTION_EMOJIS[p.e]}
          </div>
        );
      })}
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
          {cameraActive && (
            <button 
                onClick={() => {
                   retroAudio.playCameraStop();
                   setCameraActive(false);
                }}
                className="px-3 py-1 bg-red-500/20 text-red-500 hover:bg-red-500/40 hover:text-red-400 border border-red-500/50 backdrop-blur-md transition-colors cursor-pointer text-sm font-label-caps tracking-widest"
            >
              STOP
            </button>
          )}
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
                  onClick={() => {
                    retroAudio.init();
                    retroAudio.playCameraStart();
                    handleStartCamera();
                  }}
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
