import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, Play, Pause, Trash2, ArrowRightLeft, Copy, Download, Sparkles, Folder as FolderIcon } from 'lucide-react';
import api from '../services/api';
import Folder from '../components/effects/Folder';

const AudioToText: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState('hi'); // Default Hindi translation
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio player refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Saved audio archives in LocalStorage folder state
  const [savedAudios, setSavedAudios] = useState<Array<{
    id: string;
    name: string;
    size: string;
    transcript: string;
    translation: string;
    targetLang: string;
    timestamp: string;
    url: string;
  }>>(() => {
    const cached = localStorage.getItem('unicomm_saved_audios');
    return cached ? JSON.parse(cached) : [];
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp3', 'wav', 'm4a', 'flac', 'ogg'];
    if (ext && validExts.includes(ext)) {
      setFile(selectedFile);
      setAudioUrl(URL.createObjectURL(selectedFile));
      setTranscript('');
      setTranslatedText('');
    } else {
      alert("Unsupported file format! Please upload .mp3, .wav, .m4a, .flac, or .ogg files.");
    }
  };

  const triggerBrowse = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const clearFile = () => {
    setFile(null);
    setAudioUrl(null);
    setTranscript('');
    setTranslatedText('');
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const convertAudio = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', targetLang);

    try {
      const res = await api.post('/predict/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTranscript(res.data.transcription);
      setTranslatedText(res.data.translation);
    } catch (e) {
      console.error(e);
      alert("Failed to convert audio file. Ensure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const downloadText = (text: string, label: string) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label}_transcription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTranslate = async () => {
    if (!transcript) return;
    setLoading(true);
    try {
      const res = await api.post('/translate', {
        text: transcript,
        target_language: targetLang
      });
      setTranslatedText(res.data.translated_text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentAudio = () => {
    if (!file || !transcript) return;
    if (savedAudios.some(a => a.name === file.name && a.transcript === transcript)) {
      alert("This transcription is already archived in your folder!");
      return;
    }

    const newAudio = {
      id: Date.now().toString(),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2),
      transcript,
      translation: translatedText,
      targetLang,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      url: audioUrl || ''
    };

    const updated = [newAudio, ...savedAudios].slice(0, 3); // Maximum 3 items visually inside the folder
    setSavedAudios(updated);
    localStorage.setItem('unicomm_saved_audios', JSON.stringify(updated));
  };

  const clearArchive = () => {
    setSavedAudios([]);
    localStorage.removeItem('unicomm_saved_audios');
  };

  const loadAudioFromFolder = (audio: typeof savedAudios[0]) => {
    // Create a mock file object for UI display
    setFile({ name: audio.name, size: parseFloat(audio.size) * 1024 * 1024 } as File);
    setAudioUrl(audio.url || null);
    setTranscript(audio.transcript);
    setTranslatedText(audio.translation);
    setTargetLang(audio.targetLang);
    setIsPlaying(false);
  };

  // Render visual cards peeking out from the folder
  const folderItems = savedAudios.map((audio, i) => (
    <div 
      key={audio.id} 
      className="flex flex-col justify-between h-full w-full text-[8px] p-2 text-zinc-950 font-bold select-none cursor-pointer text-left bg-white border border-zinc-200/80 rounded-lg shadow-sm hover:bg-zinc-50 transition-colors"
      onClick={(e) => {
        e.stopPropagation(); // prevent closing folder
        loadAudioFromFolder(audio);
      }}
      title={`Click to load: ${audio.name}`}
    >
      <div className="flex items-center gap-1 border-b border-zinc-100 pb-0.5 mb-1 shrink-0">
        <FileAudio size={10} className="text-zinc-600 shrink-0" />
        <span className="truncate w-[35px] font-black text-[7px]">{audio.name}</span>
      </div>
      <p className="line-clamp-2 text-[6px] text-zinc-500 font-medium leading-[7px] grow">
        {audio.transcript}
      </p>
      <span className="text-[5px] text-zinc-400 mt-0.5 shrink-0 block text-right font-normal">
        {audio.timestamp}
      </span>
    </div>
  ));

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Main Workspace */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Upload card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <FileAudio className="text-primary h-5 w-5" />
            <span>Audio File-to-Text Converter</span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload drag area */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all min-h-[220px] ${
                dragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-700'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".mp3,.wav,.m4a,.flac,.ogg" 
                onChange={handleFileChange}
                className="hidden"
              />
              
              {!file ? (
                <>
                  <UploadCloud className="h-10 w-10 text-zinc-500 animate-bounce" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-zinc-300">Drag and drop your audio file here</p>
                    <p className="text-[10px] text-zinc-500">Supports: mp3, wav, m4a, flac, ogg</p>
                  </div>
                  <button 
                    onClick={triggerBrowse}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary border border-primary/20 text-primary hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Browse Files
                  </button>
                </>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center gap-3 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/80">
                    <FileAudio className="text-primary shrink-0" size={24} />
                    <div className="min-w-0 flex-grow">
                      <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-zinc-500 font-bold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={clearFile}
                      className="p-2 hover:bg-destructive/15 text-zinc-500 hover:text-destructive rounded-lg cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {audioUrl && (
                    <div className="flex items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                      <audio 
                        ref={audioRef} 
                        src={audioUrl} 
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <button 
                        onClick={togglePlayback}
                        className="p-2 bg-primary text-white rounded-full hover:scale-105 transition-all cursor-pointer"
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <span className="text-[10px] font-bold text-zinc-400">Audio Preview Player</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action trigger card */}
            <div className="bg-zinc-950/20 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Translation Language Code</span>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="ja">Japanese (日本語)</option>
                    <option value="zh">Chinese (中文)</option>
                  </select>
                </div>

                <div className="text-[10px] text-zinc-500 space-y-1 leading-relaxed">
                  <p>• Transcriptions process offline locally if available.</p>
                  <p>• Make sure file size is under 25MB.</p>
                </div>
              </div>

              <button
                onClick={convertAudio}
                disabled={!file || loading}
                className="w-full py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs tracking-wider transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Convert Speech-to-Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Transcription Results area */}
        {(transcript || translatedText) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Transcription */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Transcription output</span>
                <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              </div>
              
              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-800/40 shrink-0">
                <button 
                  onClick={() => copyText(transcript)}
                  className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Copy Text"
                >
                  <Copy size={13} />
                </button>
                <button 
                  onClick={() => downloadText(transcript, 'original')}
                  className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Download TXT"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>

            {/* Translation */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Translated output ({targetLang.toUpperCase()})</span>
                <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                  {translatedText || 'Click translate to generate translation...'}
                </p>
              </div>
              
              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-800/40 shrink-0">
                {transcript && !translatedText && (
                  <button
                    onClick={handleTranslate}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all cursor-pointer mr-auto"
                  >
                    Translate Text
                  </button>
                )}
                {translatedText && (
                  <>
                    <button 
                      onClick={() => copyText(translatedText)}
                      className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Copy Text"
                    >
                      <Copy size={13} />
                    </button>
                    <button 
                      onClick={() => downloadText(translatedText, 'translated')}
                      className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Download TXT"
                    >
                      <Download size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Storage Archive Folder */}
      <div className="space-y-6">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col items-center justify-between min-h-[380px] relative overflow-hidden">
          {/* Header */}
          <div className="w-full text-center mb-6">
            <h2 className="text-sm font-bold text-foreground flex items-center justify-center gap-1.5">
              <FolderIcon className="text-primary h-4 w-4" />
              <span>Audio Storage Folder</span>
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium leading-relaxed">
              Click the folder to open your archives.<br/>
              Click a paper to load the saved audio workspace.
            </p>
          </div>

          {/* Folder Mounting Center */}
          <div className="h-[210px] flex items-center justify-center relative w-full mb-4">
            {savedAudios.length === 0 ? (
              <div className="text-center space-y-2 select-none">
                <Folder color="#52525B" size={1.2} items={[]} className="opacity-95" />
                <p className="text-[10px] font-bold text-zinc-500 mt-3">Folder is empty</p>
              </div>
            ) : (
              <Folder size={1.25} color="#A1A1AA" items={folderItems} />
            )}
          </div>

          {/* Actions */}
          <div className="w-full space-y-3 pt-4 border-t border-zinc-800/60 mt-4 shrink-0">
            {file && transcript && (
              <button
                onClick={saveCurrentAudio}
                className="w-full py-2.5 bg-primary/10 hover:bg-primary border border-primary/20 text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-primary/5"
              >
                Save Current File to Folder
              </button>
            )}

            {savedAudios.length > 0 && (
              <button
                onClick={clearArchive}
                className="w-full py-2 text-zinc-500 hover:text-destructive rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center block bg-zinc-950/20 hover:bg-destructive/5 border border-zinc-800/40"
              >
                Clear Folder Archive
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioToText;
