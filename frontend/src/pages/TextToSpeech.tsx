import React, { useState, useEffect } from 'react';
import { Volume2, Play, Download, Sparkles, Sliders } from 'lucide-react';
import api from '../services/api';

const TTS_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', gender: 'neutral' },
  { code: 'en-GB', name: 'English (UK)', gender: 'neutral' },
  { code: 'hi-IN', name: 'Hindi (भारत)', gender: 'neutral' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)', gender: 'neutral' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)', gender: 'neutral' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)', gender: 'neutral' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)', gender: 'neutral' }
];

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const [langCode, setLangCode] = useState('en-US');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [speed, setSpeed] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load local voices for Web Speech API
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const generateSpeech = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setAudioUrl(null);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language_code', langCode);
      formData.append('speaking_rate', speed.toString());

      const res = await api.post('/text-to-speech', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.use_native_synthesis) {
        // Fallback to local native browser synthesis
        speakNative();
      } else if (res.data.audio_content) {
        // Handle Google Cloud base64 audio output
        const audioBlob = base64ToBlob(res.data.audio_content, 'audio/mp3');
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      }
    } catch (e) {
      console.error("FastAPI TTS failure, falling back to browser SpeechSynthesis:", e);
      speakNative();
    } finally {
      setLoading(false);
    }
  };

  const speakNative = () => {
    const synth = window.speechSynthesis;
    synth.cancel(); // Stop active speaking

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.lang = langCode;

    // Try to find matching voice on client
    const matchingVoice = voices.find(v => {
      const langMatch = v.lang.toLowerCase().replace('_', '-') === langCode.toLowerCase().replace('_', '-');
      if (!langMatch) return false;
      
      const vName = v.name.toLowerCase();
      if (gender === 'male') {
        return vName.includes('male') || vName.includes('david') || vName.includes('google');
      } else {
        return vName.includes('female') || vName.includes('zira') || vName.includes('hazel');
      }
    });

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    
    synth.speak(utterance);
    
    // Save to history db
    try {
      api.post('/history', {
        mode: 'text-to-speech',
        originalText: text,
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
  };

  const handleDownload = () => {
    if (!audioUrl) {
      // Create a native download fallback using window alert, or generate a dummy blob if native synth is active
      alert("Voice download requires GCS (Google Cloud Storage) credentials. Running native playback instead.");
      return;
    }
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice_speech.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Speech Panel */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Volume2 className="text-primary h-5 w-5" />
          <span>Multimodal Text-to-Speech Terminal</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Block: Text Area */}
          <div className="md:col-span-8 space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Speech Input Text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message here to synthesize audio..."
              className="w-full min-h-[240px] bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 text-xs font-semibold text-foreground outline-none resize-none focus:border-zinc-700 leading-relaxed"
            />
          </div>

          {/* Right Block: Synthesizer Settings */}
          <div className="md:col-span-4 bg-zinc-950/20 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Language Selection */}
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Language Target</span>
                <select
                  value={langCode}
                  onChange={(e) => setLangCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  {TTS_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {/* Gender Selection */}
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Voice Gender</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGender('female')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      gender === 'female'
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    Female Voice
                  </button>
                  <button
                    onClick={() => setGender('male')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      gender === 'male'
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    Male Voice
                  </button>
                </div>
              </div>

              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Playback Speed</span>
                  <span className="text-primary">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-primary bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

            </div>

            {/* Submit triggers */}
            <div className="space-y-2 mt-6">
              <button
                onClick={generateSpeech}
                disabled={!text.trim() || loading}
                className="w-full py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Voice</span>
                  </>
                )}
              </button>

              {audioUrl && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const audio = new Audio(audioUrl);
                      audio.play();
                    }}
                    className="flex-grow py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Play Audio</span>
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl flex items-center justify-center cursor-pointer"
                    title="Download Audio"
                  >
                    <Download size={14} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default TextToSpeech;
