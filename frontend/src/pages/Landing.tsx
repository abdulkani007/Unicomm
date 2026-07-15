import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Camera, Mic, FileAudio, Languages, Volume2, History, ArrowRight,
  ShieldCheck, Zap, Activity, Info, Mail, Cpu
} from 'lucide-react';
import LightRays from '../components/effects/LightRays';
import DeafCommLogo from '../components/brand/DeafCommLogo';
import RotatingText from '../components/effects/RotatingText';
import Shuffle from '../components/effects/Shuffle';
import BubbleMenu from '../components/effects/BubbleMenu';
import MagicBento from '../components/effects/MagicBento';
import TargetCursor from '../components/effects/TargetCursor';
import TextPressure from '../components/effects/TextPressure';
import TextType from '../components/effects/TextType';
import Hand3DShowcase from '../components/effects/Hand3DShowcase';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  const features = [
    {
      title: "Sign Language to Text",
      desc: "Real-time hand sign recognition translating American Sign Language (ASL) gestures into readable text instantly using local neural nets.",
      icon: <Camera className="h-6 w-6 text-foreground" />,
      path: "/sign-to-text",
      badge: "Local AI model"
    },
    {
      title: "Speech to Text",
      desc: "High-accuracy live voice capture and speech-to-text transcription powered by OpenAI Whisper, ideal for conversations.",
      icon: <Mic className="h-6 w-6 text-foreground" />,
      path: "/speech-to-text",
      badge: "Real-Time Whisper"
    },
    {
      title: "Audio File to Text",
      desc: "Upload recorded audio files (MP3, WAV, M4A, FLAC, WebM) and transcribe their full contents into organized, copyable text.",
      icon: <FileAudio className="h-6 w-6 text-foreground" />,
      path: "/audio-to-text",
      badge: "File uploader"
    },
    {
      title: "Multi-language Translation",
      desc: "Instant multi-lingual translation layers to bridge language barriers between international sign or speech transcripts.",
      icon: <Languages className="h-6 w-6 text-foreground" />,
      path: "/translate",
      badge: "Google Cloud Translate"
    },
    {
      title: "Text to Speech",
      desc: "Convert text output back into realistic spoken audio using state-of-the-art neural Text-to-Speech voices.",
      icon: <Volume2 className="h-6 w-6 text-foreground" />,
      path: "/text-to-speech",
      badge: "Google Cloud TTS"
    },
    {
      title: "Conversational History",
      desc: "Keep records of all transcriptions, translations, and sessions automatically saved and synchronized to the cloud.",
      icon: <History className="h-6 w-6 text-foreground" />,
      path: "/history",
      badge: "Secure Cloud Sync",
      authOnly: true
    }
  ];

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 relative overflow-x-hidden">
      {/* LightRays Backdrop */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={0.8}
        lightSpread={0.6}
        rayLength={2.5}
        followMouse={false}
        pulsating={true}
        fadeDistance={0.8}
        saturation={0.5}
      />

      {/* Snap-to-Target Animated GSAP Cursor */}
      <TargetCursor 
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
        hoverDuration={0.2}
        cursorColor="#ffffff"
        cursorColorOnTarget="#ffffff"
        targetSelector=".cursor-target"
      />

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-[#070709]/80 border-b border-zinc-900/60 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer cursor-target shrink-0" onClick={() => navigate('/login')}>
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg shadow-black/40">
            <DeafCommLogo size={16} />
          </div>
          <span className="font-extrabold text-base md:text-lg text-foreground flex items-center gap-1.5 shrink-0">
            <span>UniComm</span>
            <RotatingText
              texts={['AI', 'Sign', 'Voice', 'Sync', 'Link']}
              mainClassName="bg-zinc-100 text-zinc-950 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-lg text-[10px] md:text-xs font-black overflow-hidden"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2200}
              splitBy="characters"
              auto
              loop
            />
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors cursor-pointer cursor-target">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors cursor-pointer cursor-target">How It Works</a>
          <a href="#about" className="hover:text-white transition-colors cursor-pointer cursor-target">About</a>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <Link 
            to="/login" 
            className="px-2.5 py-2 text-xs md:text-sm font-bold hover:text-white text-zinc-400 transition-all cursor-pointer cursor-target whitespace-nowrap"
          >
            Log In
          </Link>
          <Link 
            to="/register" 
            className="px-3.5 py-2 text-xs md:text-sm font-bold bg-zinc-100 text-zinc-950 rounded-xl hover:bg-zinc-200 transition-all shadow-md cursor-pointer cursor-target whitespace-nowrap"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32 max-w-6xl mx-auto flex flex-col items-center text-center space-y-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800/80 bg-zinc-900/40 text-xs font-bold text-zinc-400 uppercase tracking-widest"
        >
          <Cpu className="h-3.5 w-3.5 text-zinc-400" />
          <span>Next Generation Translation Engine</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="max-w-4xl"
        >
          <Shuffle
            text="Breaking Communication Barriers with Artificial Intelligence"
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-white leading-tight"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.02}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            respectReducedMotion={true}
            loop={false}
            loopDelay={0}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed font-medium"
        >
          UniComm empowers deaf and speech-impaired individuals to express themselves freely. We translate sign language, voice, and audio files into universal text and speech, seamlessly connecting lives.
        </motion.p>

        {/* Call to Actions */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center max-w-md"
        >
          <button
            onClick={() => navigate('/login')}
            className="flex-grow flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-zinc-100 text-zinc-950 font-black shadow-lg hover:bg-zinc-200 transition-all duration-200 cursor-pointer text-sm cursor-target"
          >
            <span>Get Started Free</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex-grow flex items-center justify-center gap-2 py-4 px-6 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur hover:bg-zinc-850 hover:border-zinc-700 text-white font-bold transition-all duration-200 cursor-pointer text-sm cursor-target"
          >
            <span>Try Demo</span>
          </button>
        </motion.div>

        {/* 3D Hand Landmark Animation Showcase centerpiece */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.8 }}
          className="w-full max-w-4xl mt-12 mb-8 z-10"
        >
          <Hand3DShowcase />
        </motion.div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-4 mb-16">
          <div style={{ position: 'relative', height: '80px', width: '100%' }} className="mb-2">
            <TextPressure
              text="AI Powered Translation Tools"
              flex={true}
              alpha={false}
              stroke={false}
              width={true}
              weight={true}
              italic={true}
              textColor="#ffffff"
              minFontSize={28}
            />
          </div>
          <p className="text-zinc-400 font-semibold max-w-xl mx-auto">Explore all core modules. Sign in to access all recognition engines and speech transcription tools.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <MagicBento
            cards={features.map(f => ({
              title: f.title,
              description: f.desc,
              label: f.badge,
              icon: f.icon,
              path: f.path,
              authOnly: f.authOnly
            }))}
            onCardClick={() => {
              navigate('/login');
            }}
            textAutoHide={false}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={false}
            enableMagnetism={false}
            clickEffect={true}
            spotlightRadius={400}
            particleCount={12}
            glowColor="255, 255, 255"
          />
        </motion.div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="px-6 py-24 bg-zinc-950/20 border-y border-zinc-900/50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              <TextType
                text="How It Works"
                typingSpeed={75}
                pauseDuration={3000}
                showCursor={true}
                cursorCharacter="_"
                loop={true}
                startOnVisible={true}
              />
            </h2>
            <p className="text-zinc-400 font-semibold max-w-xl mx-auto">Our seamless digital translation process from webcam gesture into voice synthesis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="space-y-4 text-center md:text-left">
              <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 font-black text-sm mx-auto md:mx-0">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Capture Sign Gestures</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Hold your hand up to the camera. MediaPipe dynamically tracks and maps 21 skeletal landmarks in real-time.
              </p>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 font-black text-sm mx-auto md:mx-0">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Classify Neural Signs</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Our local PyTorch Custom CNN model instantly processes the cropped hand matrix and maps it to text representations.
              </p>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 font-black text-sm mx-auto md:mx-0">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Convert to Speech</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Translate the transcription instantly or trigger Google Cloud Text-to-Speech voices to audibly speak out the result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 py-24 max-w-4xl mx-auto text-center space-y-8 z-10 relative">
        <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto shadow-lg">
          <Info size={24} className="text-zinc-300" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          <TextType
            text="Our Mission & Purpose"
            typingSpeed={75}
            pauseDuration={3000}
            showCursor={true}
            cursorCharacter="_"
            loop={true}
            startOnVisible={true}
          />
        </h2>
        <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto font-medium">
          UniComm was developed to create a world where barriers do not define relationships. By pairing high-speed neural network architectures with easy-to-use interfaces, we deliver translation tools directly inside the web browser.
        </p>
        <div className="flex justify-center gap-8 pt-4 text-sm font-bold text-zinc-500">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-400" /> Fully Encrypted Data
          </span>
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-zinc-400" /> &lt; 50ms Latency
          </span>
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-400" /> Offline Compatible
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 px-6 py-12 text-center text-xs text-zinc-500 font-bold z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <DeafCommLogo size={14} />
            </div>
            <span className="text-sm font-extrabold text-white">UniComm AI</span>
          </div>

          <div className="flex gap-6 text-zinc-500">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-white">Process</a>
            <a href="#about" className="hover:text-white">Mission</a>
            <Link to="/login" className="hover:text-white">Sign In</Link>
          </div>

          <div className="text-[10px] text-zinc-600 tracking-wider">
            &copy; {new Date().getFullYear()} UNICOMM AI PLATFORM. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
