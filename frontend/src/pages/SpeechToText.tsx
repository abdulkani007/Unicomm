import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Copy, Languages, Volume2, Sparkles } from 'lucide-react';
import api from '../services/api';

const SpeechToText: React.FC = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [statusText, setStatusText] = useState('Microphone is idle.');
  
  // Waveform canvas vars
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Browser Speech Recognition instance
  const recognitionRef = useRef<any>(null);

  // Initialize browser speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language;
      
      rec.onstart = () => {
        setStatusText("Listening... Speak into your microphone.");
        setListening(true);
      };
      
      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        setTranscript(prev => {
          const base = finalTranscript ? prev + ' ' + finalTranscript : prev;
          return base.trim();
        });
      };
      
      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        if (e.error === 'no-speech') {
          setStatusText("No speech detected. Listening...");
        } else {
          setStatusText(`Error occurred: ${e.error}`);
          setListening(false);
        }
      };
      
      rec.onend = () => {
        setStatusText("Microphone deactivated.");
        setListening(false);
      };
      
      recognitionRef.current = rec;
    } else {
      setStatusText("Web Speech API is not supported in this browser.");
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      stopAudioWave();
    };
  }, [language]);

  // Start speech absorption
  const startListening = async () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    try {
      recognitionRef.current.start();
      await startAudioWave();
    } catch (e) {
      console.error(e);
    }
  };

  // Stop speech absorption
  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    stopAudioWave();
    
    // Save generated speech history
    if (transcript.trim()) {
      try {
        api.post('/history', {
          mode: 'speech-to-text',
          originalText: transcript,
          translatedText: transcript,
          sourceLanguage: 'en',
          targetLanguage: 'en'
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Canvas visualizer waveform animation
  const startAudioWave = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      drawWaveform();
    } catch (e) {
      console.error("Failed to start audio waveform visualizer:", e);
    }
  };

  const stopAudioWave = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgba(24, 24, 27, 0.2)'; // Clear trace with faint opacity
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5;
        
        // Gradient color for bars
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#a855f7');
        grad.addColorStop(1, '#67e8f9');
        ctx.fillStyle = grad;
        
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };
    
    draw();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
  };

  const speakText = (text: string) => {
    if (!text) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    synth.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Speech Panel Card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-zinc-800/60 pb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Mic className="text-primary h-5 w-5 animate-pulse" />
              <span>Real-Time Speech-to-Text</span>
            </h1>
            <p className="text-xs text-muted-foreground">Absorb spoken audio and transcribe it in real-time</p>
          </div>
          
          {/* Language Selection */}
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={listening}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="en-US">English (US)</option>
            <option value="hi-IN">Hindi (हिंदी)</option>
            <option value="ta-IN">Tamil (தமிழ்)</option>
            <option value="ml-IN">Malayalam (മലയാളം)</option>
            <option value="te-IN">Telugu (తెలుగు)</option>
            <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
          </select>
        </div>

        {/* Waveform & Listening Controller */}
        <div className="flex flex-col items-center gap-4 bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-5 relative overflow-hidden">
          <canvas 
            ref={canvasRef} 
            width={600} 
            height={100}
            className="w-full max-w-[600px] h-[80px] rounded-lg bg-zinc-950/20"
          />
          
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${listening ? 'bg-emerald-500 animate-ping' : 'bg-zinc-600'}`} />
            <span className="text-xs text-zinc-400 font-semibold">{statusText}</span>
          </div>

          <button
            onClick={listening ? stopListening : startListening}
            className={`p-5 rounded-full shadow-lg transition-all cursor-pointer ${
              listening 
                ? 'bg-destructive hover:bg-destructive/90 text-white shadow-destructive/20 scale-105' 
                : 'bg-primary hover:bg-primary/95 text-white shadow-primary/20 hover:scale-105'
            }`}
          >
            {listening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        </div>

        {/* Output Text Block */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Recognized Output Transcription</span>
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 min-h-[150px] relative flex flex-col justify-between">
            <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
              {transcript || 'No transcript captured. Click the microphone button above to start talking...'}
            </p>
            
            {transcript && (
              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-800/40 shrink-0">
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all cursor-pointer"
                  title="Copy Text"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => speakText(transcript)}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all cursor-pointer"
                  title="Speak Text"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default SpeechToText;
