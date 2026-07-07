import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Search, Filter, Download, Trash2, Clock, 
  MessageSquare, Volume2, ShieldAlert, ArrowLeft, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryLog {
  id: string;
  mode: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  audioUrl?: string;
  createdAt: string;
  isSynced: boolean;
}

const History: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [page, setPage] = useState(0);
  const limit = 10;

  // Fetch histories query
  const { data: logs, isLoading, error } = useQuery<HistoryLog[]>({
    queryKey: ['historyLogs', searchTerm, page],
    queryFn: async () => {
      const offset = page * limit;
      const response = await api.get(`/history?limit=${limit}&offset=${offset}&search=${searchTerm}`);
      return response.data;
    },
    retry: 1,
  });

  // Delete log mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/history/${id}`);
    },
    onSuccess: () => {
      // Invalidate query to refetch logs list
      queryClient.invalidateQueries({ queryKey: ['historyLogs'] });
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0); // reset page on search
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterMode(e.target.value);
    setPage(0);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this communication log?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    // Open CSV download URL directly in standard browser tab
    const token = localStorage.getItem('mock_token') || localStorage.getItem('fb_token');
    const exportUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/history/export?token=${token}`;
    
    // Create hidden anchor to force download
    const link = document.createElement('a');
    link.href = exportUrl;
    // Set headers is handled by the browser because token is verified by middleware
    // Note: since token is passed as query parameter for browser downloads, we handle token validation on the backend auth middleware if it detects query token!
    // In our backend auth.py, we checked security_bearer, but we can also just fetch it from local storage using axios client or standard download.
    // To make it secure and clean, we can perform a direct download fetch using axios:
    api.get('/history/export', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'unicomm_history_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((err) => {
        console.error('Failed to export history CSV:', err);
        alert('Failed to export CSV. Please try again.');
      });
  };

  // Filter logs locally if backend filtering wasn't compound
  const displayedLogs = logs ? logs.filter((log) => {
    if (filterMode === 'all') return true;
    return log.mode === filterMode;
  }) : [];

  return (
    <div className="space-y-6">
      
      {/* Upper header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Communication Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search, filter, and export your personal real-time translation history
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Download size={18} />
          <span>Export logs (CSV)</span>
        </button>
      </div>

      {/* Search and Filters panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search original or translated text..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Filter size={18} />
          </div>
          <select
            value={filterMode}
            onChange={handleFilterChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground appearance-none cursor-pointer font-semibold"
          >
            <option value="all">All Modes</option>
            <option value="sign-to-speech">Sign &rarr; Speech</option>
            <option value="speech-to-sign">Speech &rarr; Sign</option>
            <option value="text-to-speech">Text &rarr; Speech</option>
            <option value="two-way">Two-way Dialogue</option>
          </select>
        </div>
      </div>

      {/* Logs list panel */}
      <div className="bg-card/40 border border-border/50 rounded-xl glass-panel overflow-hidden shadow-sm">
        <div className="divide-y divide-border/30">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-6 h-20 w-full bg-muted/20 animate-pulse border-b border-border/10" />
              ))
            ) : displayedLogs.length > 0 ? (
              displayedLogs.map((log) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -10 }}
                  key={log.id}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-background/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-muted-foreground">
                      {log.mode === 'sign-to-speech' ? <MessageSquare size={18} /> : <Volume2 size={18} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-secondary text-foreground">
                          {log.mode.replace('-', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground mt-2">{log.originalText}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Source Language: <span className="font-semibold">{log.sourceLanguage.toUpperCase()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 border-border/30 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-sm font-black text-primary">{log.translatedText}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Target Language: <span className="font-semibold">{log.targetLanguage.toUpperCase()}</span>
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-2.5 rounded-xl border border-input hover:bg-destructive/10 hover:text-destructive hover:border-destructive text-muted-foreground transition-all cursor-pointer"
                      title="Delete log record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No communication logs match the query criteria. Try adjusting filters or searches.
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination controls */}
        {displayedLogs.length > 0 && (
          <div className="p-4 border-t border-border/30 bg-background/20 flex justify-between items-center text-sm font-semibold">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg border border-input bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Previous</span>
            </button>
            <span className="text-muted-foreground">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={displayedLogs.length < limit}
              className="px-4 py-2 rounded-lg border border-input bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default History;
