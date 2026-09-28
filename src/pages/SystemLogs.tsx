// src/pages/SystemLogs.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, Terminal, RefreshCw, X, Copy, Check,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '../components/ui/StatCard';
import { api } from '../services/api';

export interface AuditLog {
  id: string;
  created_at: string;
  server_id?: string;
  server_name?: string;
  endpoint: string;
  method: string;
  status_code?: number;
  response_time_ms?: number;
  status: 'Success' | 'Warning' | 'Error';
  event_type: string;
  description: string;
  details: Record<string, any>;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get<{
        items: AuditLog[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(`/api/node/servers/logs?${params.toString()}`);

      if (res && Array.isArray(res.items)) {
        setLogs(res.items);
        setTotalPages(res.total_pages || 1);
        setTotalCount(res.total || 0);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Terminal size={20} className="text-emerald-400" />
            <span>System & Server Logs</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Audit real-time HTTP calls, reachability probes, and responses between the platform and 3x-ui servers.
          </p>
        </div>

        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
        >
          <RefreshCw size={13} className={cn(loading && "animate-spin text-emerald-400")} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text"
            placeholder="Search endpoint, server name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex bg-zinc-950 p-0.5 border border-zinc-800/60 rounded-lg text-[11px] font-medium self-start sm:self-auto">
          {(['All', 'Success', 'Warning', 'Error'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                statusFilter === st ? "bg-zinc-850 text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. DESKTOP VIEW: DATA TABLE (>= lg) */}
        {/* ========================================================================= */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/60 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-950/20">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Server Node</th>
                <th className="py-3 px-5">HTTP Method & Path</th>
                <th className="py-3 px-5">Latency</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-xs text-zinc-500 font-mono">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw size={14} className="animate-spin text-emerald-400" />
                      <span>Fetching live HTTP audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr 
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-5 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    {/* Server Node */}
                    <td className="py-3 px-5 font-semibold text-zinc-200">
                      {log.server_name || 'System Daemon'}
                    </td>

                    {/* Endpoint */}
                    <td className="py-3 px-5 font-mono max-w-sm">
                      <div className="flex items-center space-x-2 truncate">
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                          log.method === 'POST' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {log.method}
                        </span>
                        <span className="text-zinc-300 truncate" title={log.endpoint}>{log.endpoint}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate font-sans mt-0.5">{log.description}</p>
                    </td>

                    {/* Response Latency */}
                    <td className="py-3 px-5 font-mono text-zinc-400 text-[11px]">
                      {log.response_time_ms !== undefined ? `${log.response_time_ms} ms` : '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border",
                        log.status === 'Success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        log.status === 'Warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {log.status} {log.status_code ? `(${log.status_code})` : ''}
                      </span>
                    </td>

                    {/* Details Action */}
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-xs text-zinc-500">
                    No HTTP call logs recorded yet. Use "Force Sync Traffic Now" or test a server connection to generate live calls.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* 2. TABLET & MOBILE VIEW: RESPONSIVE CARDS (< lg) */}
        {/* ========================================================================= */}
        <div className="block lg:hidden p-3.5 sm:p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading server audit records...</div>
          ) : logs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        <h4 className="font-bold text-xs text-zinc-200 truncate">{log.server_name || 'System Node'}</h4>
                      </div>

                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border shrink-0",
                        log.status === 'Success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        log.status === 'Warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {log.status}
                      </span>
                    </div>

                    <div className="p-2 bg-zinc-900/60 border border-zinc-850 rounded-lg text-xs font-mono truncate text-zinc-300">
                      <span className="text-emerald-400 mr-1 font-bold">{log.method}</span>
                      {log.endpoint}
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-snug truncate">{log.description}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between font-mono text-[11px] text-zinc-500">
                    <span>Latency: {log.response_time_ms || 0} ms</span>
                    <span className="text-zinc-400 font-semibold font-sans">Inspect &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">No logs found matching criteria.</div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-zinc-800/40 bg-zinc-950/40 flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Page {page} of {totalPages} ({totalCount} total)</span>
            <div className="flex space-x-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Real HTTP Response & Payload Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border",
                    selectedLog.status === 'Success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  )}>
                    {selectedLog.method} • {selectedLog.status}
                  </span>
                  <h3 className="text-xs font-bold text-zinc-100 font-mono">{selectedLog.server_name || 'Node'}</h3>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">API Endpoint:</span>
                  <span className="text-zinc-200 select-all truncate max-w-sm">{selectedLog.endpoint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Response Latency:</span>
                  <span className="text-zinc-200">{selectedLog.response_time_ms !== undefined ? `${selectedLog.response_time_ms} ms` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">HTTP Status:</span>
                  <span className={selectedLog.status === 'Success' ? "text-emerald-400" : "text-rose-400"}>
                    {selectedLog.status_code || "Connection Failed / Offline"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Description</span>
                <p className="text-zinc-200 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 leading-relaxed font-normal">
                  {selectedLog.description}
                </p>
              </div>

              {/* JSON Context */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium font-sans">Raw Server Response & Details:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(JSON.stringify(selectedLog.details, null, 2))}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 font-mono"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copied ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-950 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SystemLogs;