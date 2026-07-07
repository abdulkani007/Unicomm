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

  // State Management
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessingSign, setIsProcessingSign] = useState(false);
  
  // Landmarking buffer (sequence length 30, feature size 126)
  const landmarkBufferRef = useRef<number[][]>([]);
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
  const [mediaPipeStatus, setMediaPipeStatus] = useState<'unloaded' | 'loading' | 'ready' | 'error'>('unloaded');

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
        // Translate real-time text to all supported languages
        updateAllTranslations(activeTranscript);
      }

      // If final transcript is settled, append it to conversation log and save in DB
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
        await api.post('/history', {
          mode: 'speech-to-sign',
          originalText: text,
          translatedText: text,
          sourceLanguage: 'en',
          targetLanguage: 'en'
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if camera is still active to maintain continuous listening
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
      
      // 1. Start continuous Speech Recognition (Microphone)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Speech recognition already running:", e);
        }
      }

      // 2. Start Camera and MediaPipe Hands
      try {
        const HandsClass = window.Hands;
        hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          drawResults(results);
          recordLandmarksFrame(results);
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
    
    // Map requests for parallel compilation
    await Promise.all(
      SUPPORTED_LANGUAGES.map(async (lang) => {
        try {
          const response = await api.post('/predict/translate', {
            text,
            target_language: lang.code
          });
          
          updated[lang.code] = response.data.translated_text || text;
        } catch (err) {
          console.error(`Failed translation for language: ${lang.code}`, err);
          updated[lang.code] = text; // fallback to original
        }
      })
    );

    setLiveTranslations(updated);
  };

  // Record landmarks frame coordinates sequence
  const recordLandmarksFrame = (results: any) => {
    if (!isCapturingRef.current) return;

    const frameLandmarks = new Array(126).fill(0.0);
    
    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((landmarks: any, handIdx: number) => {
        const handType = results.multiHandedness[handIdx].label;
        const offset = handType === "Left" ? 0 : 63;
        
        landmarks.forEach((pt: any, i: number) => {
          if (i < 21) {
            frameLandmarks[offset + i * 3] = pt.x;
            frameLandmarks[offset + i * 3 + 1] = pt.y;
            frameLandmarks[offset + i * 3 + 2] = pt.z;
          }
        });
      });
    }

    landmarkBufferRef.current.push(frameLandmarks);

    if (landmarkBufferRef.current.length >= 30) {
      const sequenceToSend = [...landmarkBufferRef.current];
      landmarkBufferRef.current = [];
      performSignPrediction(sequenceToSend);
    }
  };

  // Run sign prediction POST request
  const performSignPrediction = async (sequence: number[][]) => {
    setIsProcessingSign(true);
    try {
      const response = await api.post('/predict/sign', {
        sequence,
        model_version: 'latest'
      });
      const data = response.data;
      
      if (data.prediction && data.confidence > 0.75) {
        setPredictionHistory(prev => [
          { word: data.prediction, conf: data.confidence },
          ...prev.slice(0, 4)
        ]);

        speakText(data.prediction, 'en-US');

        setDialogue(prev => [
          ...prev,
          {
            id: 'sign_' + Date.now(),
            sender: 'deaf',
            text: data.prediction,
            translation: `[Sign]: ${data.prediction}`,
            timestamp: new Date()
          }
        ]);
        
        await api.post('/history', {
          mode: 'sign-to-speech',
          originalText: data.prediction,
          translatedText: data.prediction,
          sourceLanguage: 'en',
          targetLanguage: 'en'
        });
      }
    } catch (err) {
      console.error("Sign prediction error:", err);
    } finally {
      setIsProcessingSign(false);
    }
  };

  // Draw landmarks on video overlay canvas
  const drawResults = (results: any) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        landmarks.forEach((pt: any) => {
          canvasCtx.beginPath();
          canvasCtx.arc(pt.x * canvasRef.current.width, pt.y * canvasRef.current.height, 4, 0, 2 * Math.PI);
          canvasCtx.fillStyle = '#a855f7';
          canvasCtx.fill();
        });
      }
    }
    canvasCtx.restore();
  };

  // TTS Synthesis Trigger (Backend Google TTS + Native fallback)
  const speakText = async (text: string, langCode: string = 'en-US') => {
    try {
      const response = await api.post('/predict/tts', `text=${encodeURIComponent(text)}&language_code=${langCode}&speaking_rate=${acc.speechSpeed}`, {
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

    await api.post('/history', {
      mode: 'text-to-speech',
      originalText: text,
      translatedText: text,
      sourceLanguage: 'en',
      targetLanguage: 'en'
    });
  };

  // Mock prediction triggers for testing/VM setups
  const handleMockSign = (word: string) => {
    setPredictionHistory(prev => [
      { word, conf: 0.98 },
      ...prev.slice(0, 4)
    ]);
    
    speakText(word, 'en-US');
    
    setDialogue(prev => [
      ...prev,
      {
        id: 'mock_sign_' + Date.now(),
        sender: 'deaf',
        text: word,
        translation: `[Sign]: ${word}`,
        timestamp: new Date()
      }
    ]);
    
    api.post('/history', {
      mode: 'sign-to-speech',
      originalText: word,
      translatedText: word,
      sourceLanguage: 'en',
      targetLanguage: 'en'
    });
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
      
      {/* Top Section: Split Camera & Dialogue Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[55%] min-h-[300px]">
        
        {/* Left: Camera view block */}
        <div className="lg:col-span-7 bg-card/40 border border-border/50 rounded-xl p-4 glass-panel flex flex-col relative shadow-sm h-full">
          <div className="flex justify-between items-center mb-3 z-10">
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                cameraActive 
                  ? 'bg-destructive text-white hover:bg-destructive/95' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/25'
              }`}
            >
              {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
              <span>{cameraActive ? 'Close Devices' : 'Start Devices'}</span>
            </button>
          </div>

          <div className="flex-grow rounded-xl bg-slate-900 overflow-hidden relative border border-border/20 flex items-center justify-center">
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
                
                {/* HUD showing Mic is active */}
                {speechActive && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-emerald-500/80 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-sm animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    <span>MICROPHONE ACTIVE (LISTENING...)</span>
                  </div>
                )}

                {isProcessingSign && (
                  <div className="absolute top-4 left-4 p-2 rounded-lg bg-black/70 text-primary text-[10px] font-bold flex items-center gap-1.5 border border-primary/20 backdrop-blur-sm">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Inference running...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 text-white/50 space-y-3">
                <CameraOff size={40} className="mx-auto text-muted" />
                <p className="text-xs font-semibold">Camera and Microphone are offline.</p>
                {mediaPipeStatus === 'loading' && (
                  <p className="text-[10px] text-primary font-bold animate-pulse">Loading MediaPipe Models...</p>
                )}
                {mediaPipeStatus === 'ready' && (
                  <p className="text-[10px]">Click "Start Devices" to launch camera tracking and continuous speech absorption.</p>
                )}
              </div>
            )}
          </div>

          {/* Predict HUD */}
          <div className="mt-2.5 flex gap-2 overflow-x-auto py-1 items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Sign History:</span>
            {predictionHistory.length > 0 ? (
              predictionHistory.map((pred, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full"
                >
                  <span>{pred.word}</span>
                  <span className="opacity-60">({(pred.conf * 100).toFixed(0)}%)</span>
                </span>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground italic">No signs detected.</span>
            )}
          </div>
        </div>

        {/* Right: Conversation Dialogue stream */}
        <div className="lg:col-span-5 flex flex-col bg-card/40 border border-border/50 rounded-xl glass-panel shadow-sm overflow-hidden h-full">
          <div className="p-3 border-b border-border/30 bg-background/20 flex justify-between items-center">
            <h2 className="text-xs font-bold text-foreground">Active Chat Stream</h2>
            <button
              onClick={() => setDialogue([])}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Chat scrolling feed */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3">
            {dialogue.length > 0 ? (
              dialogue.map((item) => {
                const isDeaf = item.sender === 'deaf';
                return (
                  <div key={item.id} className={`flex flex-col ${isDeaf ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] text-muted-foreground mb-0.5 font-bold">
                      {isDeaf ? 'Deaf User (Sign/Text)' : 'Hearing User (Speech)'}
                    </span>
                    <div className={`max-w-[85%] rounded-xl p-2.5 shadow-sm ${
                      isDeaf ? 'bg-primary text-primary-foreground rounded-tl-none' : 'bg-card text-foreground border border-border/50 rounded-tr-none'
                    }`}>
                      <p className="text-xs font-semibold">{item.text}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-[10px] italic">
                Logs show here in real-time.
              </div>
            )}
          </div>

          <form onSubmit={handleTextSubmit} className="p-3 border-t border-border/30 bg-background/20 flex gap-2">
            <input
              type="text"
              placeholder="Type to speak out..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow px-3 py-2 rounded-lg border border-input bg-background/50 outline-none text-xs text-foreground"
            />
            <button type="submit" className="p-2.5 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer">
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>

      {/* Bottom Section: Live Multi-Language Speech Translation Dashboard */}
      <div className="bg-card/40 border border-border/50 rounded-xl p-5 glass-panel flex flex-col flex-grow shadow-sm min-h-[220px] overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 animate-pulse" />
              <span>Continuous Speech Translation Dashboard</span>
            </h2>
            <p className="text-[10px] text-muted-foreground">Talk continuously. Audio is absorbed and translated into 7 languages simultaneously.</p>
          </div>
          {speechActive && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </div>

        {/* Current speaker transcription panel */}
        <div className="mb-4 bg-background/30 p-3 rounded-lg border border-border/30 flex items-center justify-between">
          <div className="text-xs font-bold text-foreground">
            Current spoken input (English): <span className="text-primary font-black ml-1">"{liveTranscript || 'Start speaking to begin absorption...'}"</span>
          </div>
          {liveTranscript && (
            <button
              onClick={() => speakText(liveTranscript, 'en-US')}
              className="p-1.5 rounded-lg hover:bg-secondary text-primary cursor-pointer"
              title="Repeat Speech"
            >
              <Volume2 size={15} />
            </button>
          )}
        </div>

        {/* Multi-language Translation Grid */}
        <div className="flex-grow overflow-x-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 min-w-[900px] h-full pb-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const translatedVal = liveTranslations[lang.code] || 'Waiting...';
              return (
                <div 
                  key={lang.code} 
                  className="bg-card/30 border border-border/30 rounded-xl p-3.5 flex flex-col justify-between hover:bg-background/20 transition-all group"
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-primary tracking-wide uppercase">{lang.name}</span>
                      <span className="text-[9px] text-muted-foreground">{lang.nativeName}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground line-clamp-3 leading-relaxed">
                      {translatedVal}
                    </p>
                  </div>
                  
                  {translatedVal !== 'Waiting...' && translatedVal !== 'Waiting for speech...' && (
                    <button
                      onClick={() => speakText(translatedVal, lang.voiceCode)}
                      className="mt-3 py-1 px-2 rounded-lg bg-primary/10 hover:bg-primary hover:text-white text-primary text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 size={11} />
                      <span>Speak</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mock Sign simulator keyboards inside bottom row as a sidebar utility */}
        <div className="mt-2 text-center text-[9px] text-muted-foreground flex justify-center gap-4 items-center border-t border-border/20 pt-2.5">
          <span>Camera not working? Click gestures above to simulate sign sequence predictions.</span>
          <div className="flex gap-1.5">
            {["SORRY", "WELCOME"].map(word => (
              <button
                key={word}
                onClick={() => handleMockSign(word)}
                className="px-2 py-0.5 text-[9px] font-bold rounded border border-border/40 hover:bg-primary hover:text-white"
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
