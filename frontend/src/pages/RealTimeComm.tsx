import React, { useRef, useState, useEffect } from 'react';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Camera, CameraOff, Mic, MicOff, Volume2, Sparkles, 
  Send, Trash2, Languages, HelpCircle, Check, Play, Square, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Declaring types for MediaPipe and SpeechRecognition
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  voiceCode: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', voiceCode: 'en-US' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceCode: 'ta-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceCode: 'ml-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceCode: 'kn-IN' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', voiceCode: 'ar-SA' }
];

const RealTimeComm: React.FC = () => {
  const acc = useAccessibility();
  
  // DOM References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio SpeechRecognition reference
  const recognitionRef = useRef<any>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const predictionHistoryQueueRef = useRef<Array<string>>([]);
  const lastLoggedPredictionRef = useRef<string>('None');

  // State Management
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessingSign, setIsProcessingSign] = useState(false);
  const isCapturingRef = useRef<boolean>(false);

  // Live Speech Recognition states
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveTranslations, setLiveTranslations] = useState<Record<string, string>>({
    en: 'Waiting for speech...',
    hi: 'भाषण की प्रतीक्षा है...',
    ta: 'பேச்சுக்காக காத்திருக்கிறது...',
    ml: 'സംസാരത്തിനായി കാത്തിരിക്കുന്നു...',
    te: 'మాట్లాడటానికి వేచి ఉంది...',
    kn: 'ಭಾಷಣಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದೆ...',
    ar: 'في انتظار التحدث...'
  });
  const [speechActive, setSpeechActive] = useState(false);

  // Dialogue stream logs
  const [dialogue, setDialogue] = useState<Array<{
    id: string;
    sender: 'deaf' | 'hearing';
    text: string;
    translation?: string;
    timestamp: Date;
  }>>([
    {
      id: 'init_1',
      sender: 'deaf',
      text: 'HELLO',
      translation: 'नमस्ते (Hello)',
      timestamp: new Date(Date.now() - 60000)
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [predictionHistory, setPredictionHistory] = useState<Array<{word: string, conf: number}>>([]);
  const [smoothedPrediction, setSmoothedPrediction] = useState('None');
  const [smoothedConfidence, setSmoothedConfidence] = useState(0.0);
  const [mediaPipeStatus, setMediaPipeStatus] = useState<'unloaded' | 'loading' | 'ready' | 'error'>('unloaded');
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Load MediaPipe Hands dynamically from CDN
  useEffect(() => {
    if (window.Hands && window.Camera) {
      setMediaPipeStatus('ready');
      return;
    }

    setMediaPipeStatus('loading');
    const loadScripts = async () => {
      try {
        const loadScript = (src: string) => {
          return new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        };

        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        
        console.log("MediaPipe scripts loaded successfully.");
        setMediaPipeStatus('ready');
      } catch (err) {
        console.error("Failed to load MediaPipe from CDN:", err);
        setMediaPipeStatus('error');
      }
    };

    loadScripts();
  }, []);

  // Initialize SpeechRecognition Engine
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Browser does not support native SpeechRecognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setSpeechActive(true);
      console.log("Continuous speech recognition active.");
    };

    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeTranscript = finalTranscript || interimTranscript;
      if (activeTranscript.trim()) {
        setLiveTranscript(activeTranscript);
        updateAllTranslations(activeTranscript);
      }

      // If final transcript is settled, append it to conversation log
      if (finalTranscript.trim()) {
        const text = finalTranscript.trim();
        setDialogue(prev => [
          ...prev,
          {
            id: 'speech_' + Date.now(),
            sender: 'hearing',
            text: text,
            translation: `[Speech]: ${text}`,
            timestamp: new Date()
          }
        ]);

        // Save entry in db history
        try {
          await api.post('/history', {
            mode: 'speech-to-sign',
            originalText: text,
            translatedText: text,
            sourceLanguage: 'en',
            targetLanguage: 'en'
          });
        } catch (e) {
          console.error("Failed saving speech history:", e);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      if (isCapturingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Failed to restart speech recognition:", e);
        }
      } else {
        setSpeechActive(false);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  // Control Camera & Microphone Lifecycle together
  useEffect(() => {
    let camera: any = null;
    let hands: any = null;

    if (cameraActive && mediaPipeStatus === 'ready' && videoRef.current) {
      isCapturingRef.current = true;
      
      // Start continuous Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Speech recognition already running:", e);
        }
      }

      // Start Camera and MediaPipe Hands
      try {
        const HandsClass = window.Hands;
        hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        hands.onResults((results: any) => {
          // Track FPS
          const nowTime = Date.now();
          if (lastFrameTimeRef.current > 0) {
            setFps(Math.round(1000 / (nowTime - lastFrameTimeRef.current)));
          }
          lastFrameTimeRef.current = nowTime;

          drawResults(results);
          processHandFrameForInference(results);
        });

        const CameraClass = window.Camera;
        camera = new CameraClass(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        camera.start();
      } catch (err) {
        console.error("Camera startup failed:", err);
        setCameraActive(false);
      }
    }

    return () => {
      isCapturingRef.current = false;
      
      // Stop continuous Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Failed to stop speech recognition:", e);
        }
      }

      // Stop Camera
      if (camera) {
        camera.stop();
      }
      if (hands) {
        hands.close();
      }
    };
  }, [cameraActive, mediaPipeStatus]);

  // Translate input text to ALL 7 languages simultaneously
  const updateAllTranslations = async (text: string) => {
    const updated: Record<string, string> = {};
    
    await Promise.all(
      SUPPORTED_LANGUAGES.map(async (lang) => {
        try {
          const response = await api.post('/translate', {
            text,
            target_language: lang.code
          });
          updated[lang.code] = response.data.translated_text || text;
        } catch (err) {
          console.error(`Failed translation for language: ${lang.code}`, err);
          updated[lang.code] = text;
        }
      })
    );

    setLiveTranslations(updated);
  };

  // Extract hand coordinates, crop locally, and predict sign
  const processHandFrameForInference = async (results: any) => {
    if (!isCapturingRef.current) return;

    // Check if hand is detected
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && videoRef.current) {
      const now = Date.now();
      // Throttle server requests to once every 350ms to prevent network congestion
      if (now - lastInferenceTimeRef.current < 350) return;
      lastInferenceTimeRef.current = now;

      const video = videoRef.current;
      const landmarks = results.multiHandLandmarks[0];

      // Setup offline canvas for cropping & scaling to 224x224
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = 224;
      cropCanvas.height = 224;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return;

      // Identify bounding box coordinates
      const xCoords = landmarks.map((pt: any) => pt.x);
      const yCoords = landmarks.map((pt: any) => pt.y);
      const xMin = Math.min(...xCoords);
      const xMax = Math.max(...xCoords);
      const yMin = Math.min(...yCoords);
      const yMax = Math.max(...yCoords);

      const boxWidth = xMax - xMin;
      const boxHeight = yMax - yMin;
      const side = Math.max(boxWidth, boxHeight);

      // Add 25% padding to frame the hand completely
      const padding = side * 0.25;
      const paddedSide = side + 2 * padding;

      const centerX = (xMin + xMax) / 2;
      const centerY = (yMin + yMax) / 2;

      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;

      let sx = (centerX - paddedSide / 2) * videoWidth;
      let sy = (centerY - paddedSide / 2) * videoHeight;
      let sSide = paddedSide * videoWidth;

      // Clamp to video dimensions
      if (sx < 0) sx = 0;
      if (sy < 0) sy = 0;
      if (sx + sSide > videoWidth) sSide = videoWidth - sx;
      if (sy + sSide > videoHeight) sSide = videoHeight - sy;

      if (sSide <= 10) return;

      // Render the cropped crop image block
      cropCtx.drawImage(video, sx, sy, sSide, sSide, 0, 0, 224, 224);

      // Upload crop JPEG blob
      cropCanvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('file', blob, 'hand_crop.jpg');

        setIsProcessingSign(true);
        try {
          const response = await api.post('/predict-sign', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const data = response.data;
          
          if (data.prediction && data.confidence >= 0.80) {
            updatePredictionHistory(data.prediction, data.confidence);
          } else {
            updatePredictionHistory("None", 0.0);
          }
        } catch (err) {
          console.error("Sign prediction request failed:", err);
          updatePredictionHistory("None", 0.0);
        } finally {
          setIsProcessingSign(false);
        }
      }, 'image/jpeg', 0.85);
    } else {
      // No hands in view, decay prediction smoothing queue
      handleNoHands();
    }
  };

  // Prediction smoothing majority voting (mode) logic
  const updatePredictionHistory = async (label: string, confidence: number) => {
    const queue = predictionHistoryQueueRef.current;
    queue.push(label);
    if (queue.length > 8) {
      queue.shift();
    }

    const counts: Record<string, number> = {};
    queue.forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
    });

    let modeLabel = 'None';
    let maxCount = 0;
    Object.entries(counts).forEach(([val, count]) => {
      if (count > maxCount) {
        maxCount = count;
        modeLabel = val;
      }
    });

    // Update stable state if consensus is met (>50% window)
    if (modeLabel !== 'None' && maxCount >= 4) {
      setSmoothedPrediction(modeLabel);
      setSmoothedConfidence(confidence > 0 ? confidence : 0.85);

      setPredictionHistory(prev => {
        if (prev.length > 0 && prev[0].word === modeLabel) return prev;
        return [{ word: modeLabel, conf: confidence || 0.85 }, ...prev.slice(0, 4)];
      });

      // Speak and log once per stable sign state change
      if (modeLabel !== lastLoggedPredictionRef.current) {
        lastLoggedPredictionRef.current = modeLabel;
        speakText(modeLabel, 'en-US');

        setDialogue(prev => [
          ...prev,
          {
            id: 'sign_' + Date.now(),
            sender: 'deaf',
            text: modeLabel,
            translation: `[Sign]: ${modeLabel}`,
            timestamp: new Date()
          }
        ]);

        // Save entry in Firestore History
        try {
          await api.post('/history', {
            mode: 'sign-to-speech',
            originalText: modeLabel,
            translatedText: modeLabel,
            sourceLanguage: 'en',
            targetLanguage: 'en'
          });
        } catch (e) {
          console.error("Failed saving history entry:", e);
        }
      }
    } else if (modeLabel === 'None') {
      setSmoothedPrediction('None');
      setSmoothedConfidence(0.0);
      lastLoggedPredictionRef.current = 'None';
    }
  };

  const handleNoHands = () => {
    updatePredictionHistory("None", 0.0);
  };

  // Draw skeletal lines on canvas overlay
  const drawResults = (results: any) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, w, h);
    
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw points
        landmarks.forEach((pt: any) => {
          canvasCtx.beginPath();
          canvasCtx.arc(pt.x * w, pt.y * h, 5, 0, 2 * Math.PI);
          canvasCtx.fillStyle = '#a855f7';
          canvasCtx.fill();
        });
        
        // Draw custom connecting lines
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [0, 5], [5, 6], [6, 7], [7, 8],
          [5, 9], [9, 10], [10, 11], [11, 12],
          [9, 13], [13, 14], [14, 15], [15, 16],
          [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
        ];
        
        canvasCtx.strokeStyle = '#3b82f6';
        canvasCtx.lineWidth = 2;
        connections.forEach(([s, e]) => {
          const ptS = landmarks[s];
          const ptE = landmarks[e];
          canvasCtx.beginPath();
          canvasCtx.moveTo(ptS.x * w, ptS.y * h);
          canvasCtx.lineTo(ptE.x * w, ptE.y * h);
          canvasCtx.stroke();
        });
      }
    }
    canvasCtx.restore();
  };

  // TTS Synthesis Trigger (Backend Google TTS + Native fallback)
  const speakText = async (text: string, langCode: string = 'en-US') => {
    try {
      const response = await api.post('/text-to-speech', `text=${encodeURIComponent(text)}&language_code=${langCode}&speaking_rate=${acc.speechSpeed}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const data = response.data;
      
      if (data.use_native_synthesis) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.text);
          utterance.lang = data.language_code || 'en-US';
          utterance.rate = data.speaking_rate || 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } else if (data.audio_data) {
        const audio = new Audio(data.audio_data);
        audio.play();
      }
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = acc.speechSpeed;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Text Form Submission Dialogue Action
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText('');
    
    setDialogue(prev => [
      ...prev,
      {
        id: 'text_' + Date.now(),
        sender: 'deaf',
        text: text,
        translation: text,
        timestamp: new Date()
      }
    ]);

    speakText(text, 'en-US');

    try {
      await api.post('/history', {
        mode: 'text-to-speech',
        originalText: text,
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      });
    } catch (e) {
      console.error("Failed saving text log history:", e);
    }
  };

  // Mock prediction triggers for testing/VM setups
  const handleMockSign = (word: string) => {
    setPredictionHistory(prev => [
      { word, conf: 0.98 },
      ...prev.slice(0, 4)
    ]);
    
    speakText(word, 'en-US');
    
    try {
      api.post('/history', {
        mode: 'sign-to-speech',
        originalText: word,
        translatedText: word,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      });
    } catch (e) {
      console.error("Failed saving mock history:", e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-130px)] h-auto lg:overflow-hidden pb-4">
      
      {/* Left Column: Real-Time Input Console (Camera) */}
      <div className="lg:col-span-7 flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-md backdrop-blur-xl lg:h-full min-h-[500px] overflow-hidden">
        <div className="flex justify-between items-center mb-3.5 z-10 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Camera size={16} className="text-primary" />
              <span>Real-Time Input Console</span>
            </h2>
            <p className="text-[10px] text-muted-foreground">Camera captures sign gestures | Mic records speech</p>
          </div>
          
          <button
            onClick={() => setCameraActive(!cameraActive)}
            disabled={mediaPipeStatus !== 'ready'}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              cameraActive 
                ? 'bg-destructive text-white hover:bg-destructive/95' 
                : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/25'
            }`}
          >
            {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
            <span>{cameraActive ? 'Close Devices' : 'Start Devices'}</span>
          </button>
        </div>

        {/* Video feed viewport */}
        <div className="flex-grow rounded-xl bg-slate-950 overflow-hidden relative border border-zinc-800 flex items-center justify-center min-h-0 h-full">
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
                className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none scale-x-[-1]"
              />
              
              {/* Overlay HUD indicators */}
              <div className="absolute top-3 left-3 bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800 backdrop-blur-md flex items-center gap-2 pointer-events-none">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400">LIVE FEED</span>
              </div>

              {fps > 0 && (
                <div className="absolute top-3 right-3 bg-zinc-950/85 px-2.5 py-1 rounded-lg border border-zinc-800 backdrop-blur-md text-[10px] font-bold text-zinc-300 pointer-events-none">
                  FPS: {fps}
                </div>
              )}

              {/* Translation Consensus overlay */}
              {smoothedPrediction && smoothedPrediction !== "None" && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-zinc-950/90 border border-primary/30 px-6 py-2.5 rounded-xl shadow-lg backdrop-blur-md flex flex-col items-center gap-0.5 min-w-[180px] text-center animate-fade-in">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Detected Sign</span>
                  <span className="text-lg font-black text-white">{smoothedPrediction}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-6 flex flex-col items-center gap-3">
              <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800 text-zinc-600">
                <CameraOff size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-300">Camera and Microphone are offline.</p>
                {mediaPipeStatus === 'loading' && (
                  <p className="text-[10px] text-primary font-bold animate-pulse">Loading MediaPipe Models...</p>
                )}
                {mediaPipeStatus === 'ready' && (
                  <p className="text-[10px] text-zinc-400">Click "Start Devices" to launch camera tracking and continuous speech absorption.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* HUD history segment */}
        <div className="mt-3.5 flex gap-2 overflow-x-auto py-1 items-center shrink-0 border-t border-zinc-800/60 pt-2.5">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Sign History:</span>
          <div className="flex gap-1.5 overflow-x-auto min-w-0">
            {predictionHistory.length > 0 ? (
              predictionHistory.map((pred, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full shrink-0"
                >
                  <span>{pred.word}</span>
                  <span className="opacity-60 text-[9px]">({(pred.conf * 100).toFixed(0)}%)</span>
                </span>
              ))
            ) : (
              <span className="text-[10px] text-zinc-500 italic">No signs detected in sequence.</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Continuous Speech Translation Dashboard */}
      <div className="lg:col-span-5 flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-md backdrop-blur-xl lg:h-full min-h-[500px] overflow-hidden">
        <div className="flex justify-between items-center mb-3 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span>Speech Translation Dashboard</span>
            </h2>
            <p className="text-[10px] text-muted-foreground">Audio is translated into 7 languages simultaneously</p>
          </div>
          {speechActive && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">Active</span>
            </div>
          )}
        </div>

        {/* Current spoken transcript panel */}
        <div className="mb-3.5 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-300 flex-grow pr-3">
            <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider mb-0.5">Spoken input (English)</span>
            <span className="font-semibold text-foreground">
              {liveTranscript ? `"${liveTranscript}"` : 'Start speaking to begin absorption...'}
            </span>
          </div>
          {liveTranscript && (
            <button
              onClick={() => speakText(liveTranscript, 'en-US')}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-primary border border-zinc-800 transition-all cursor-pointer shrink-0"
              title="Repeat Speech"
            >
              <Volume2 size={13} />
            </button>
          )}
        </div>

        {/* Multi-language Translation Grid (Vertical List) */}
        <div className="flex-grow overflow-y-auto min-h-0 pr-1 space-y-2.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const translatedVal = liveTranslations[lang.code] || 'Waiting...';
            const isWaiting = translatedVal === 'Waiting...' || translatedVal === 'Waiting for speech...';
            return (
              <div 
                key={lang.code} 
                className="bg-zinc-950/30 border border-zinc-800/60 rounded-xl p-3 flex flex-col justify-between hover:bg-zinc-950/50 transition-all group shrink-0"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-bold text-primary tracking-wide uppercase">{lang.name}</span>
                      <span className="text-[8px] text-zinc-500">{lang.nativeName}</span>
                    </div>
                    <p className={`text-xs font-semibold leading-normal ${isWaiting ? 'text-zinc-500 italic' : 'text-zinc-100'}`}>
                      {translatedVal}
                    </p>
                  </div>
                  
                  {!isWaiting && (
                    <button
                      onClick={() => speakText(translatedVal, lang.voiceCode)}
                      className="p-2 rounded-lg bg-zinc-900/80 hover:bg-primary hover:text-primary-foreground border border-zinc-800 text-zinc-400 hover:border-primary transition-all flex items-center justify-center cursor-pointer shrink-0"
                      title="Speak Translation"
                    >
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mock Sign simulator keyboards inside bottom row as a utility */}
        <div className="mt-3 text-center text-[9px] text-zinc-500 flex flex-col gap-2 items-center border-t border-zinc-800/60 pt-3 shrink-0">
          <span>Camera offline? Click gestures to simulate predictions:</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["GOOD", "HELLO", "HELP", "NO", "THANK YOU", "YES", "COME", "EAT", "WAKEUP"].map(word => (
              <button
                key={word}
                onClick={() => handleMockSign(word)}
                className="px-2.5 py-1 text-[9px] font-bold rounded-lg border border-zinc-800 bg-zinc-950/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer shrink-0"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default RealTimeComm;
