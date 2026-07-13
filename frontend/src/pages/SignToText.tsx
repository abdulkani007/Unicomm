import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, Sparkles, Activity, Clock, ShieldCheck } from 'lucide-react';
import api from '../services/api';

// Supported ASL Prediction classes mapping
const MOCK_PREDICTIONS = ["HELLO", "THANK YOU", "YES", "NO", "PLEASE", "GOODBYE", "HELP", "I LOVE YOU", "SORRY", "WELCOME"];

interface HistoryItem {
  word: string;
  conf: number;
  time: string;
}

const SignToText: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [currentSign, setCurrentSign] = useState('None');
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mediaPipeStatus, setMediaPipeStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Local prediction consensus buffer
  const [predictionHistory, setPredictionHistory] = useState<string[]>([]);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const requestRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const lastRequestTimeRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize MediaPipe and dependencies locally
  useEffect(() => {
    setMediaPipeStatus('loading');
    const checkResources = async () => {
      try {
        // Dynamically load MediaPipe hands package
        const checkMp = (window as any).Hands;
        if (!checkMp) {
          const scriptHands = document.createElement('script');
          scriptHands.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
          scriptHands.async = true;
          document.head.appendChild(scriptHands);

          const scriptUtils = document.createElement('script');
          scriptUtils.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
          scriptUtils.async = true;
          document.head.appendChild(scriptUtils);

          const scriptDraw = document.createElement('script');
          scriptDraw.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';
          scriptDraw.async = true;
          document.head.appendChild(scriptDraw);

          scriptHands.onload = () => {
            if ((window as any).Hands) setMediaPipeStatus('ready');
          };
        } else {
          setMediaPipeStatus('ready');
        }
      } catch (err) {
        console.error("Failed loading MediaPipe library:", err);
        setMediaPipeStatus('error');
      }
    };
    checkResources();
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Web camera activation loop
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    const startWebcam = async () => {
      if (!cameraActive) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Initialize MediaPipe Hand Tracker
        const HandsLib = (window as any).Hands;
        if (HandsLib) {
          const handsInstance = new HandsLib({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          });
          handsInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
          });
          
          handsInstance.onResults(onHandResults);
          
          const processFrame = async () => {
            if (!videoRef.current || !cameraActive) return;
            // Capture FPS
            frameCountRef.current++;
            const now = performance.now();
            if (now - lastTimeRef.current >= 1000) {
              setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
              frameCountRef.current = 0;
              lastTimeRef.current = now;
            }
            
            if (videoRef.current.readyState === 4) {
              await handsInstance.send({ image: videoRef.current });
            }
            requestRef.current = requestAnimationFrame(processFrame);
          };
          requestRef.current = requestAnimationFrame(processFrame);
        }
      } catch (e) {
        console.error("Camera access failed:", e);
        setCameraActive(false);
      }
    };

    if (cameraActive) {
      startWebcam();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraActive]);

  // Hand tracking and cropping callback
  const onHandResults = async (results: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw landmarks and lines
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw hand skeleton lines
      const drawUtils = (window as any).drawConnectors;
      const handsConn = (window as any).HAND_CONNECTIONS;
      if (drawUtils && handsConn) {
        drawUtils(ctx, landmarks, handsConn, { color: '#a855f7', lineWidth: 2 });
      }
      
      // Draw points
      landmarks.forEach((pt: any) => {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#67e8f9';
        ctx.fill();
      });

      // Calculate Bounding Box
      const xs = landmarks.map((l: any) => l.x * canvas.width);
      const ys = landmarks.map((l: any) => l.y * canvas.height);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const yMin = Math.min(...ys);
      const yMax = Math.max(...ys);

      const side = Math.max(xMax - xMin, yMax - yMin);
      const pad = side * 0.25;
      const x1 = Math.max(0, xMin - pad);
      const y1 = Math.max(0, yMin - pad);
      const size = side + 2 * pad;
      
      // Draw bounding box visual guide
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, size, size);

      // Throttling API prediction calls: run every 300-500ms (400ms chosen)
      const now = Date.now();
      if (!isProcessingRef.current && (now - lastRequestTimeRef.current >= 400)) {
        isProcessingRef.current = true;
        lastRequestTimeRef.current = now;
        setIsProcessing(true);
        try {
          // Extract hand image crop from hidden canvas
          const hiddenCanvas = document.createElement('canvas');
          hiddenCanvas.width = 224;
          hiddenCanvas.height = 224;
          const hCtx = hiddenCanvas.getContext('2d');
          if (hCtx) {
            hCtx.drawImage(
              videoRef.current,
              (x1 / canvas.width) * videoRef.current.videoWidth,
              (y1 / canvas.height) * videoRef.current.videoHeight,
              (size / canvas.width) * videoRef.current.videoWidth,
              (size / canvas.height) * videoRef.current.videoHeight,
              0, 0, 224, 224
            );
            
            // Post crop to FastAPI server
            hiddenCanvas.toBlob(async (blob) => {
              if (blob) {
                const formData = new FormData();
                formData.append('file', blob, 'crop.jpg');
                
                // Cancel pending prediction request before sending another
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                const controller = new AbortController();
                abortControllerRef.current = controller;

                try {
                  const res = await api.post('/predict/predict-sign', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: controller.signal
                  });
                  
                  const word = res.data.prediction;
                  const conf = res.data.confidence;
                  
                  setCurrentSign(word);
                  setConfidence(conf);
                  
                  // consensus prediction smoothing
                  setPredictionHistory(prev => {
                    const next = [...prev, word].slice(-8);
                    // majority consensus
                    const counts = next.reduce((acc: any, val) => {
                      acc[val] = (acc[val] || 0) + 1;
                      return acc;
                    }, {});
                    const maxVal = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                    if (counts[maxVal] >= 4) {
                      addToHistory(maxVal, conf);
                    }
                    return next;
                  });
                } catch (err: any) {
                  if (err.name !== 'CanceledError' && err.message !== 'canceled') {
                    console.error("API Prediction error:", err);
                  }
                } finally {
                  if (abortControllerRef.current === controller) {
                    isProcessingRef.current = false;
                    setIsProcessing(false);
                  }
                }
              } else {
                isProcessingRef.current = false;
                setIsProcessing(false);
              }
            }, 'image/jpeg', 0.85);
          } else {
            isProcessingRef.current = false;
            setIsProcessing(false);
          }
        } catch (e) {
          console.error("Cropping exception:", e);
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      }
    } else {
      // Auto reset prediction when no hand is detected
      setCurrentSign('None');
      setConfidence(0);
      setPredictionHistory([]);
    }
  };

  const addToHistory = async (word: string, conf: number) => {
    if (word === 'None') return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => {
      // Prevent duplicates in immediate sequence
      if (prev.length > 0 && prev[0].word === word) return prev;
      return [{ word, conf, time: timeStr }, ...prev.slice(0, 19)];
    });

    try {
      await api.post('/history', {
        mode: 'sign-to-speech',
        originalText: word,
        translatedText: word,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      });
    } catch (e) {
      console.error("Failed to save prediction history:", e);
    }
  };

  const simulateMock = (word: string) => {
    setCurrentSign(word);
    setConfidence(0.99);
    addToHistory(word, 0.99);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto pb-4">
      
      {/* Left Column: Camera View Controller */}
      <div className="lg:col-span-8 flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Camera className="text-primary h-5 w-5" />
              <span>Real-Time Sign-to-Text Input</span>
            </h1>
            <p className="text-xs text-muted-foreground">Hold sign shapes clearly inside the green viewport guide</p>
          </div>
          
          <button
            onClick={() => setCameraActive(!cameraActive)}
            disabled={mediaPipeStatus !== 'ready'}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              cameraActive 
                ? 'bg-destructive text-white hover:bg-destructive/95' 
                : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/20'
            }`}
          >
            {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
            <span>{cameraActive ? 'Deactivate Camera' : 'Activate Camera'}</span>
          </button>
        </div>

        {/* Camera video frame */}
        <div className="flex-grow rounded-2xl bg-zinc-950 overflow-hidden relative border border-zinc-800/80 min-h-[420px] flex items-center justify-center">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
              />
              
              <div className="absolute top-4 left-4 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 tracking-wider">CAMERA RUNNING</span>
              </div>
            </>
          ) : (
            <div className="text-center p-8 space-y-4">
              <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800 max-w-max mx-auto text-zinc-500">
                <CameraOff size={36} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-300">Camera preview is currently offline</p>
                {mediaPipeStatus === 'loading' && (
                  <p className="text-xs text-primary font-semibold animate-pulse mt-1">Loading MediaPipe Models...</p>
                )}
                {mediaPipeStatus === 'ready' && (
                  <p className="text-xs text-zinc-400 mt-1">Ready. Activate camera to start sign detection.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Prediction Metrics HUD & History */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* HUD Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col gap-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Activity className="text-primary h-4.5 w-4.5" />
            <span>Detection HUD Dashboard</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider mb-1">FPS Status</span>
              <span className={`text-xl font-black ${fps >= 24 ? 'text-emerald-400' : 'text-amber-500'}`}>{fps} FPS</span>
            </div>
            
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider mb-1">Confidence</span>
              <span className="text-xl font-black text-primary">{Math.round(confidence * 100)}%</span>
            </div>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-4 text-center">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Active Sign Output</span>
            <span className={`text-3xl font-black tracking-wide ${currentSign !== 'None' ? 'text-white' : 'text-zinc-600'}`}>
              {currentSign}
            </span>
          </div>
        </div>

        {/* History Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex-grow flex flex-col overflow-hidden min-h-[250px]">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-zinc-800 pb-3 shrink-0">
            <Clock className="text-primary h-4.5 w-4.5" />
            <span>Real-time History Stream</span>
          </h2>
          
          <div className="flex-grow overflow-y-auto min-h-0 py-2.5 space-y-2 pr-1 mt-1">
            {history.length > 0 ? (
              history.map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-zinc-950/30 border border-zinc-800/40 rounded-xl p-3 flex justify-between items-center hover:bg-zinc-950/50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-foreground">{item.word}</span>
                    <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                      {Math.round(item.conf * 100)}% Conf
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-bold">{item.time}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                Logs show here as signs are held...
              </div>
            )}
          </div>

          {/* Quick simulator triggers */}
          <div className="border-t border-zinc-800/60 pt-3 shrink-0 text-center text-[9px] text-zinc-500">
            <span className="block mb-2">Simulate sign gestures to test translator engine:</span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {["GOOD", "HELLO", "HELP", "NO", "THANK YOU", "YES", "COME", "EAT", "WAKEUP"].map(word => (
                <button
                  key={word}
                  onClick={() => simulateMock(word)}
                  className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-white hover:border-primary transition-all cursor-pointer"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default SignToText;
