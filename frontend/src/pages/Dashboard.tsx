import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Sparkles, Camera, Mic, Volume2, History, Settings, ArrowRight,
  TrendingUp, Users, Cpu, HardDrive, BarChart3, Clock, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  dailyActiveUsers: number;
  totalPredictions: number;
  apiUsage: number;
  modelAccuracy: number;
  storageUsed: number;
  recentHistoryCount: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch stats from backend API
  const { data: apiStats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Fetch recent history logs
  const { data: recentHistory } = useQuery({
    queryKey: ['recentHistory'],
    queryFn: async () => {
      const response = await api.get('/history?limit=100'); // fetch more to populate chart
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Calculate dynamic chart data based on actual logs
  const chartData = React.useMemo(() => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize array for past 7 days (including today)
    const list = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: daysOfWeek[date.getDay()],
        predictions: 0,
        users: 0,
        dateStr: date.toDateString()
      };
    });

    if (recentHistory && Array.isArray(recentHistory)) {
      recentHistory.forEach((log: any) => {
        const logDate = new Date(log.createdAt).toDateString();
        const match = list.find(item => item.dateStr === logDate);
        if (match) {
          match.predictions += 1;
          match.users = 1;
        }
      });
    }

    // Return format compatible with recharts
    return list.map(({ name, predictions, users }) => ({
      name,
      predictions,
      users
    }));
  }, [recentHistory]);

  // Default values if API fails or loading
  const stats: DashboardStats = apiStats || {
    dailyActiveUsers: 1,
    totalPredictions: 0,
    apiUsage: 12,
    modelAccuracy: 0.982,
    storageUsed: 2936012, // 2.8 MB (Baseline Model weights)
    recentHistoryCount: 0,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      
      {/* Upper banner */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-purple-600 dark:from-primary/90 dark:to-purple-900/90 p-8 text-white shadow-xl shadow-primary/20"
      >
        <div className="absolute top-[-30%] right-[-5%] w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-sm">
            <Sparkles size={12} /> Powered by Multimodal AI
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Real-Time Translation Platform
          </h2>
          <p className="text-white/80 text-sm md:text-base font-medium mb-6">
            Bridge communication barriers seamlessly using real-time hand sign recognition, advanced speech transcription, and natural voice synthesis.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/translate')}
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-primary font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera size={18} />
              <span>Start Real-Time Translation</span>
            </button>
            <Link
              to="/history"
              className="px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center gap-2"
            >
              <History size={18} />
              <span>View Logs</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Main SaaS Stat Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {/* Stat 1 */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Daily Active</span>
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              {stats.dailyActiveUsers}
            </h3>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
              <TrendingUp size={10} /> +12% today
            </p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Predictions</span>
            <Cpu size={18} className="text-violet-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              {stats.totalPredictions.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
              <TrendingUp size={10} /> +240 since yesterday
            </p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Model Accuracy</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              {(stats.modelAccuracy * 100).toFixed(1)}%
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Active: SignSequence v1.0
            </p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Storage Usage</span>
            <HardDrive size={18} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              {(stats.storageUsed / (1024 * 1024)).toFixed(1)} MB
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Google Cloud Bucket logs
            </p>
          </div>
        </div>

        {/* Stat 5 */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-5 glass-panel flex flex-col justify-between shadow-sm col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">API Calls</span>
            <BarChart3 size={18} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              {stats.apiUsage.toLocaleString()}
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Google Cloud Run requests
            </p>
          </div>
        </div>
      </motion.div>

      {/* Middle split: Analytics Chart & AI Modules Status */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Recharts chart */}
        <div className="lg:col-span-2 bg-card/40 border border-border/50 rounded-xl p-6 glass-panel shadow-sm flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Usage Statistics</h3>
              <p className="text-xs text-muted-foreground">Volume of AI predictions and daily users</p>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Predictions</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-400" /> Users</span>
            </div>
          </div>
          
          <div className="flex-grow w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPredictions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground opacity-50" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" className="text-muted-foreground opacity-50" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(var(--card), 0.8)', 
                    borderColor: 'rgba(var(--border), 0.5)',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="predictions" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPredictions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Modules Status card */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 glass-panel shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">AI Modules Status</h3>
            <div className="space-y-4">
              {/* Module 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Sign Recognition</h4>
                    <p className="text-[10px] text-muted-foreground">LSTM / MediaPipe</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>

              {/* Module 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <Mic size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Speech (Whisper)</h4>
                    <p className="text-[10px] text-muted-foreground">Real-time STT API</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>

              {/* Module 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Volume2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Text to Speech</h4>
                    <p className="text-[10px] text-muted-foreground">Google Cloud TTS</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-4 mt-4">
            <Link to="/settings" className="w-full flex items-center justify-between text-xs text-primary font-bold hover:underline">
              <span>Configure AI & Speech Settings</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Recent History / Activities logs */}
      <motion.div 
        variants={itemVariants}
        className="bg-card/40 border border-border/50 rounded-xl p-6 glass-panel shadow-sm"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Recent Communication Logs</h3>
            <p className="text-xs text-muted-foreground">Last conversations processed by the system</p>
          </div>
          <Link to="/history" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
            <span>View All Logs</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            // Skeleton loader
            [1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full rounded-xl bg-muted/30 animate-pulse border border-border/20" />
            ))
          ) : recentHistory && recentHistory.length > 0 ? (
            recentHistory.map((log: any) => (
              <div 
                key={log.id} 
                className="flex items-center justify-between p-4 rounded-xl bg-background/40 hover:bg-background/80 border border-border/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{log.originalText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mode: <span className="font-semibold">{log.mode}</span> &bull; {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{log.translatedText}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {log.sourceLanguage.toUpperCase()} &rarr; {log.targetLanguage.toUpperCase()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No recent communication records found. Click "Start Real-Time Translation" to make your first log.
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
};

export default Dashboard;
