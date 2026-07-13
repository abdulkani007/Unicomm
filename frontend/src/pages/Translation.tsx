import React, { useState } from 'react';
import { ArrowRightLeft, Copy, Volume2, Sparkles, Languages } from 'lucide-react';
import api from '../services/api';

const LANGUAGES_LIST = [
  { code: 'en', name: 'English', nativeName: 'English', voiceCode: 'en-US' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceCode: 'ta-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', voiceCode: 'hi-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceCode: 'ml-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceCode: 'kn-IN' },
  { code: 'fr', name: 'French', nativeName: 'Français', voiceCode: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', voiceCode: 'de-DE' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', voiceCode: 'ja-JP' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', voiceCode: 'zh-CN' }
];

const Translation: React.FC = () => {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/translate', {
        text: inputText,
        target_language: targetLang
      });
      setTranslatedText(res.data.translated_text);
    } catch (e) {
      console.error(e);
      alert("Failed to translate text.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
    
    const tempText = inputText;
    setInputText(translatedText);
    setTranslatedText(tempText);
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleSpeak = (text: string, langCode: string) => {
    if (!text) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find the voice code matching lang
    const match = LANGUAGES_LIST.find(l => l.code === langCode);
    utterance.lang = match ? match.voiceCode : 'en-US';
    synth.speak(utterance);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Translation card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Languages className="text-primary h-5 w-5" />
          <span>Multimodal Translation Terminal</span>
        </h1>

        {/* Translation split blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          
          {/* Swap Trigger (Absolute centered on desktop) */}
          <button 
            onClick={handleSwap}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-full bg-zinc-950 border border-zinc-850 hover:border-primary text-primary transition-all cursor-pointer z-10 hover:scale-115 shadow-xl hidden md:flex"
            title="Swap Languages"
          >
            <ArrowRightLeft size={14} />
          </button>

          {/* Source Panel */}
          <div className="space-y-3 flex flex-col">
            <div className="flex justify-between items-center bg-zinc-950/20 p-2 rounded-xl border border-zinc-800">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-foreground outline-none cursor-pointer"
              >
                {LANGUAGES_LIST.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name} ({lang.nativeName})</option>
                ))}
              </select>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">Source</span>
            </div>

            <div className="flex-grow relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full min-h-[220px] bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 text-xs font-semibold text-foreground outline-none resize-none focus:border-zinc-700 leading-relaxed"
              />
              
              {inputText && (
                <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
                  <button 
                    onClick={() => handleCopy(inputText)}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={() => handleSpeak(inputText, sourceLang)}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all cursor-pointer"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Destination Panel */}
          <div className="space-y-3 flex flex-col">
            <div className="flex justify-between items-center bg-zinc-950/20 p-2 rounded-xl border border-zinc-800">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-foreground outline-none cursor-pointer"
              >
                {LANGUAGES_LIST.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name} ({lang.nativeName})</option>
                ))}
              </select>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">Destination</span>
            </div>

            <div className="flex-grow relative">
              <div
                className="w-full min-h-[220px] bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 text-xs font-semibold text-foreground whitespace-pre-wrap leading-relaxed overflow-y-auto"
              >
                {translatedText || (
                  <span className="text-zinc-500 italic font-medium">Translation will display here...</span>
                )}
              </div>
              
              {translatedText && (
                <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
                  <button 
                    onClick={() => handleCopy(translatedText)}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={() => handleSpeak(translatedText, targetLang)}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all cursor-pointer"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={handleTranslate}
          disabled={!inputText.trim() || loading}
          className="w-full py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles size={14} />
              <span>Translate Text</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default Translation;
