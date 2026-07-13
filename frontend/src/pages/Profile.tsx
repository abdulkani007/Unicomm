import React, { useEffect, useState } from 'react';
import { User, Mail, ShieldAlert, Calendar, BarChart3, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface ProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        setProfileData(res.data);
      } catch (e) {
        console.error("Failed to load backend profile metadata:", e);
        // Fallback to client auth context data if backend is offline
        if (user) {
          setProfileData({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: (user as any).emailVerified || false
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-center gap-6">
        
        {/* Avatar badge */}
        <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-3xl font-black shadow-inner shadow-primary/5 shrink-0">
          {profileData?.displayName ? profileData.displayName[0].toUpperCase() : 'U'}
        </div>

        {/* User identification */}
        <div className="flex-grow space-y-1.5 text-center md:text-left min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            {profileData?.displayName || 'UniComm User'}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center justify-center md:justify-start gap-1.5 truncate">
            <Mail size={12} className="text-zinc-500" />
            <span>{profileData?.email || 'No email registered'}</span>
          </p>
          
          <div className="flex justify-center md:justify-start pt-1">
            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              profileData?.emailVerified
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>
              <ShieldAlert size={9} />
              <span>{profileData?.emailVerified ? 'Verified Account' : 'Pending Verification'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Profile Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">User UID Reference</span>
            <Database size={16} className="text-primary" />
          </div>
          <span className="text-xs font-semibold text-zinc-300 font-mono select-all truncate mt-4">
            {profileData?.uid || 'Not available'}
          </span>
        </div>

        {/* Card 2 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Subscription Tier</span>
            <BarChart3 size={16} className="text-primary" />
          </div>
          <div>
            <span className="text-lg font-black text-white block">Free Academic</span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Final Year Project Edition</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Integration State</span>
            <Calendar size={16} className="text-primary" />
          </div>
          <div>
            <span className="text-lg font-black text-white block">Connected</span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Active Firebase Auth Session</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Profile;
