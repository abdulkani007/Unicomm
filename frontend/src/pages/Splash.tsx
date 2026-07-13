import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SideRays from '../components/effects/SideRays';
import DeafCommLogo from '../components/brand/DeafCommLogo';
import RotatingText from '../components/effects/RotatingText';

const Splash: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Increment loading progress bar
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 80);

    // Auto navigate after 2.5 seconds
    const timeout = setTimeout(() => {
      navigate('/landing');
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="h-screen w-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden">
      {/* SideRays background with premium grayscale look */}
      <div className="absolute inset-0 z-0">
        <SideRays
          speed={1.5}
          rayColor1="#ffffff"
          rayColor2="#71717a"
          intensity={1.2}
          spread={1.5}
          origin="top-right"
          tilt={10}
          saturation={0}
          blend={0.5}
          falloff={1.4}
          opacity={0.3}
        />
      </div>

      {/* Main glassmorphic card container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="z-10 p-12 max-w-md w-[90%] rounded-3xl border border-zinc-800/40 bg-zinc-950/40 glass-panel shadow-2xl flex flex-col items-center text-center space-y-8"
      >
        {/* Animated Brand logo wrapper */}
        <motion.div
          initial={{ rotate: -15, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="h-20 w-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-xl shadow-black/60 shrink-0"
        >
          <DeafCommLogo size={44} />
        </motion.div>

        {/* Dynamic Rotating brand text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>UniComm</span>
            <RotatingText
              texts={['AI', 'Sign', 'Voice', 'Sync', 'Link']}
              mainClassName="bg-zinc-100 text-zinc-950 px-2.5 py-0.5 rounded-xl text-xl font-extrabold overflow-hidden"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={1200}
              splitBy="characters"
              auto
              loop
            />
          </h1>
          <p className="text-xs font-semibold text-zinc-400 tracking-wide uppercase mt-1">
            Universal Communication Platform
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
          Bridging silence and speech using real-time neural gesture translation and synthetic voice services.
        </p>

        {/* Loading Progress Indicator */}
        <div className="w-full space-y-2">
          <div className="w-full bg-zinc-900 border border-zinc-800/50 h-2 rounded-full overflow-hidden p-0.5">
            <motion.div 
              className="bg-zinc-100 h-full rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeInOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-bold tracking-wider">
            <span>INITIALIZING ENGINE</span>
            <span>{progress}%</span>
          </div>
        </div>
      </motion.div>

      {/* Decorative footer label */}
      <div className="absolute bottom-6 text-[10px] text-zinc-600 font-extrabold tracking-widest z-10">
        POWERED BY DEEPMIND AI & PYTORCH
      </div>
    </div>
  );
};

export default Splash;
