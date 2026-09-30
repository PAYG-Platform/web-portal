// src/pages/Servers.tsx
import React, { useState, useEffect } from 'react';
import { 
  Server, Plus, RefreshCw, Trash2, Edit2, Globe, Cpu,
  Search, X, CheckCircle2, AlertCircle, AlertTriangle, 
  ShieldAlert, Check, Eye, EyeOff, Radio
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../components/ui/StatCard';
import { api } from '../services/api';

export interface LocationItem {
  id: string;
  name: string;
  country_code: string;
  flag: string;
  is_active: boolean;
  total_capacity?: number;
  used_capacity?: number;
  is_full?: boolean;
}

export interface InboundLimitItem {
  inbound_id: number;
  tag?: string;
  protocol: string;
  port?: number;
  domain_or_ip?: string;
  path?: string;
  user_limit: number;
  used_limit?: number;
}

export interface ServerType {
  id: string;
  location_id?: string;
  name: string;
  api_url: string;
  api_token: string;
  domain_or_ip?: string;
  port?: number;
  protocol_type?: string;
  target_inbound_id?: number;
  xui_version?: string;
  price_per_gb: number;
  price_per_gb_usd?: number;
  is_active: boolean;
  is_reachable?: boolean;
  last_error?: string;
  inbound_limits: InboundLimitItem[];
  created_at?: string;
}

export function Servers() {
  // Main Tab Navigation: 'servers' vs 'locations'
  const [activeTab, setActiveTab] = useState<'servers' | 'locations'>('servers');

  // Locations State
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', country_code: '', flag: '🌐' });

  // Delete Region / Location Modal State (Requires re-typing region name)
  const [deleteLocationModalOpen, setDeleteLocationModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationItem | null>(null);
  const [deleteConfirmLocationName, setDeleteConfirmLocationName] = useState('');
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);

  // Servers State
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Server Modal State (Requires re-typing name)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<ServerType | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeletingServer, setIsDeletingServer] = useState(false);

  // Right-Side Server Drawer State
  const [isServerDrawerOpen, setIsServerDrawerOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectingInbounds, setDetectingInbounds] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);

  // Dedicated Test Connection States
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    status: 'success' | 'error';
    message: string;
  } | null>(null);

  // Server Form Inputs
  const [serverForm, setServerForm] = useState({
    name: '',
    location_id: '',
    xui_version: 'v3.5.0',
    api_url: '',
    api_token: '',
    price_per_gb: 1000,
    price_per_gb_usd: 0.05
  });

  // Dynamic Inbounds Editor List
  const [dynamicInbounds, setDynamicInbounds] = useState<InboundLimitItem[]>([
    { inbound_id: 1, tag: 'VLESS Reality :443', protocol: 'vless_reality', port: 443, domain_or_ip: '', path: '', user_limit: 10, used_limit: 0 },
    { inbound_id: 2, tag: 'VLESS XHTTP :443', protocol: 'xhttp', port: 443, domain_or_ip: '', path: '/xhttp', user_limit: 15, used_limit: 0 }
  ]);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Locations & Servers from Backend
  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const res = await api.get<LocationItem[]>('/api/node/servers/locations');
      setLocations(Array.isArray(res) ? res : []);
    } catch {
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchServers = async () => {
    setLoadingServers(true);
    try {
      const res = await api.get<ServerType[]>('/api/node/servers/');
      setServers(Array.isArray(res) ? res : []);
    } catch {
      setServers([]);
    } finally {
      setLoadingServers(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchServers();
  }, []);

  // Location Actions
  const handleOpenAddLocation = () => {
    setEditingLocation(null);
    setLocationForm({ name: '', country_code: '', flag: '🌐' });
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocation = (loc: LocationItem) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name,
      country_code: loc.country_code,
      flag: loc.flag
    });
    setIsLocationModalOpen(true);
  };

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.name.trim() || !locationForm.country_code.trim()) return;

    try {
      if (editingLocation) {
        await api.put(`/api/node/servers/locations/${editingLocation.id}`, {
          name: locationForm.name.trim(),
          country_code: locationForm.country_code.trim().toUpperCase(),
          flag: locationForm.flag.trim() || '🌐'
        });
        showToast(`Region '${locationForm.name}' updated successfully!`, 'success');
      } else {
        await api.post('/api/node/servers/locations', {
          name: locationForm.name.trim(),
          country_code: locationForm.country_code.trim().toUpperCase(),
          flag: locationForm.flag.trim() || '🌐'
        });
        showToast(`Region '${locationForm.name}' created successfully!`, 'success');
      }

      setIsLocationModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      showToast(err.message || 'Failed to save location region.', 'error');
    }
  };

  const handleOpenDeleteLocationModal = (loc: LocationItem) => {
    setLocationToDelete(loc);
    setDeleteConfirmLocationName('');
    setDeleteLocationModalOpen(true);
  };

  const handleConfirmDeleteLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationToDelete || deleteConfirmLocationName.trim() !== locationToDelete.name.trim()) return;

    setIsDeletingLocation(true);
    try {
      const res = await api.delete<any>(`/api/node/servers/locations/${locationToDelete.id}?force=true`);
      showToast(res.message || `Region '${locationToDelete.name}' and its servers deleted.`, 'success');
      setDeleteLocationModalOpen(false);
      setLocationToDelete(null);
      setDeleteConfirmLocationName('');
      fetchLocations();
      fetchServers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete region.', 'error');
    } finally {
      setIsDeletingLocation(false);
    }
  };

  // Test Connection Action
  const handleTestConnection = async (customUrl?: string, customToken?: string, serverId?: string) => {
    const urlToTest = customUrl || serverForm.api_url.trim();
    const tokenToTest = customToken || serverForm.api_token.trim();

    if (!urlToTest || !tokenToTest) {
      showToast('Please enter both the 3x-UI Panel URL and API Token.', 'error');
      return;
    }

    if (serverId) {
      setTestingServerId(serverId);
    } else {
      setTestingConnection(true);
      setConnectionTestResult(null);
    }

    try {
      const res = await api.post<{ status: string; message: string }>('/api/node/servers/test-connection', {
        api_url: urlToTest,
        api_token: tokenToTest
      });

      const successMsg = res.message || 'Server panel is reachable and API token is valid!';
      if (!serverId) {
        setConnectionTestResult({ status: 'success', message: successMsg });
      }
      showToast(successMsg, 'success');
    } catch (err: any) {
      const errMsg = err.message || 'Failed to connect to 3x-UI panel.';
      if (!serverId) {
        setConnectionTestResult({ status: 'error', message: errMsg });
      }
      showToast(errMsg, 'error');
    } finally {
      if (serverId) {
        setTestingServerId(null);
      } else {
        setTestingConnection(false);
      }
    }
  };

  // Server Actions
  const handleOpenAddServer = () => {
    setEditingServer(null);
    setShowApiToken(false);
    setConnectionTestResult(null);
    setServerForm({
      name: '',
      location_id: locations[0]?.id || '',
      xui_version: 'v3.5.0',
      api_url: '',
      api_token: '',
      price_per_gb: 1000,
      price_per_gb_usd: 0.05
    });

    setDynamicInbounds([
      { inbound_id: 1, tag: 'VLESS Reality :443', protocol: 'vless_reality', port: 443, domain_or_ip: '', path: '', user_limit: 10, used_limit: 0 },
      { inbound_id: 2, tag: 'VLESS XHTTP :443', protocol: 'xhttp', port: 443, domain_or_ip: '', path: '/xhttp', user_limit: 15, used_limit: 0 }
    ]);

    setIsServerDrawerOpen(true);
  };

  const handleOpenEditServer = (srv: ServerType) => {
    setEditingServer(srv);
    setShowApiToken(false);
    setConnectionTestResult(null);

    setServerForm({
      name: srv.name,
      location_id: srv.location_id || '',
      xui_version: srv.xui_version || 'v3.5.0',
      api_url: srv.api_url || '',
      api_token: srv.api_token || '',
      price_per_gb: srv.price_per_gb || 1000,
      price_per_gb_usd: srv.price_per_gb_usd ?? 0.05
    });

    const existingLimits = (srv.inbound_limits || []).map((lim, idx) => ({
      inbound_id: lim.inbound_id || (idx + 1),
      tag: lim.tag || `${lim.protocol.toUpperCase()} Inbound #${lim.inbound_id || (idx + 1)}`,
      protocol: lim.protocol || 'vless_reality',
      port: lim.port || 443,
      domain_or_ip: lim.domain_or_ip || '',
      path: lim.path || '',
      user_limit: lim.user_limit || 10,
      used_limit: lim.used_limit || 0
    }));

    setDynamicInbounds(existingLimits.length > 0 ? existingLimits : [
      { inbound_id: 1, tag: 'VLESS Reality :443', protocol: 'vless_reality', port: 443, domain_or_ip: '', path: '', user_limit: 10, used_limit: 0 }
    ]);

    setIsServerDrawerOpen(true);
  };

  // Detect inbounds from 3x-ui (Extracts hosts, paths, Reality, XHTTP, and WebSocket configs)
  const handleDetectInbounds = async () => {
    if (!serverForm.api_url.trim() || !serverForm.api_token.trim()) {
      showToast('Please enter the 3x-UI API URL and API Token first.', 'error');
      return;
    }

    setDetectingInbounds(true);
    try {
      const res = await api.post<{ status: string; inbounds: InboundLimitItem[] }>('/api/node/servers/detect-inbounds', {
        api_url: serverForm.api_url.trim(),
        api_token: serverForm.api_token.trim()
      });

      if (res && Array.isArray(res.inbounds) && res.inbounds.length > 0) {
        const updated = res.inbounds.map(detected => {
          const existing = dynamicInbounds.find(d => Number(d.inbound_id) === Number(detected.inbound_id));
          return {
            ...detected,
            user_limit: existing?.user_limit || detected.user_limit || 10,
            used_limit: existing?.used_limit || 0,
            domain_or_ip: detected.domain_or_ip || existing?.domain_or_ip || '',
            path: detected.path || existing?.path || '/'
          };
        });

        setDynamicInbounds(updated);
        showToast(`Detected ${updated.length} inbound(s) with Hosts & Paths directly from 3x-UI!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to detect inbounds from 3x-UI.', 'error');
    } finally {
      setDetectingInbounds(false);
    }
  };

  const handleAddInboundRow = () => {
    const nextId = dynamicInbounds.length > 0 
      ? Math.max(...dynamicInbounds.map(i => Number(i.inbound_id) || 0)) + 1 
      : 1;

    setDynamicInbounds(prev => [
      ...prev,
      {
        inbound_id: nextId,
        tag: `Inbound #${nextId}`,
        protocol: 'xhttp',
        port: 443,
        domain_or_ip: '',
        path: '/xhttp',
        user_limit: 10,
        used_limit: 0
      }
    ]);
  };

  const handleRemoveInboundRow = (idxToRemove: number) => {
    if (dynamicInbounds.length <= 1) {
      showToast('A server must have at least one inbound configured.', 'error');
      return;
    }
    const target = dynamicInbounds[idxToRemove];
    if (target && (target.used_limit || 0) > 0) {
      showToast(`Cannot remove inbound #${target.inbound_id} because it currently hosts ${target.used_limit} user(s).`, 'error');
      return;
    }
    setDynamicInbounds(prev => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleSubmitServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverForm.name.trim() || !serverForm.api_url.trim()) return;

    for (const inb of dynamicInbounds) {
      if (inb.user_limit < (inb.used_limit || 0)) {
        showToast(`Cannot reduce limit for ${inb.tag || inb.protocol} below currently used (${inb.used_limit} users).`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: serverForm.name.trim(),
        location_id: serverForm.location_id || undefined,
        xui_version: serverForm.xui_version,
        api_url: serverForm.api_url.trim().replace(/\/$/, ''),
        api_token: serverForm.api_token.trim(),
        inbound_limits: dynamicInbounds.map(inb => ({
          inbound_id: Number(inb.inbound_id) || 1,
          tag: inb.tag?.trim() || undefined,
          protocol: inb.protocol,
          port: Number(inb.port) || 443,
          domain_or_ip: inb.domain_or_ip?.trim() || undefined,
          path: inb.path?.trim() || undefined,
          user_limit: Number(inb.user_limit) || 1
        })),
        price_per_gb: Number(serverForm.price_per_gb) || 1000,
        price_per_gb_usd: Number(serverForm.price_per_gb_usd) || 0.05
      };

      if (editingServer) {
        await api.put(`/api/node/servers/${editingServer.id}`, payload);
        showToast(`Server node '${serverForm.name}' updated!`, 'success');
      } else {
        await api.post('/api/node/servers/', payload);
        showToast(`Server node '${serverForm.name}' registered and auto-provisioned!`, 'success');
      }

      setIsServerDrawerOpen(false);
      fetchServers();
      fetchLocations();
    } catch (err: any) {
      showToast(err.message || 'Failed to save server node.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Server Deletion Modal Trigger
  const handleOpenDeleteModal = (srv: ServerType) => {
    setServerToDelete(srv);
    setDeleteConfirmName('');
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverToDelete || deleteConfirmName.trim() !== serverToDelete.name.trim()) return;

    setIsDeletingServer(true);
    try {
      const res = await api.delete<any>(`/api/node/servers/${serverToDelete.id}?force=true`);
      showToast(res.message || `Server node '${serverToDelete.name}' deleted successfully.`, 'success');
      setDeleteModalOpen(false);
      setServerToDelete(null);
      setDeleteConfirmName('');
      fetchServers();
      fetchLocations();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete server.', 'error');
    } finally {
      setIsDeletingServer(false);
    }
  };

  const filteredServers = servers.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const loc = locations.find(l => l.id === s.location_id);
    return (
      s.name.toLowerCase().includes(q) ||
      (s.api_url || '').toLowerCase().includes(q) ||
      (loc?.name || '').toLowerCase().includes(q)
    );
  });

  const hasUnreachableServers = servers.some(s => s.is_reachable === false);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in",
          toastMessage.type === 'success' ? "bg-zinc-950 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-rose-500/30 text-rose-400"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Server size={20} className="text-emerald-400" />
            <span>Infrastructure & Server Management</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Connect 3x-UI panels to automatically discover inbounds and fetch real connection URIs directly from the panel.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchLocations();
              fetchServers();
            }}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Refresh Infrastructure"
          >
            <RefreshCw size={14} className={cn((loadingServers || loadingLocations) && "animate-spin text-emerald-400")} />
          </button>

          {activeTab === 'servers' ? (
            <button 
              type="button"
              onClick={handleOpenAddServer}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Add Server Node</span>
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleOpenAddLocation}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Add Region</span>
            </button>
          )}
        </div>
      </div>

      {/* Unreachable Server Warning Banner */}
      {hasUnreachableServers && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-2.5 text-xs text-amber-300 animate-in fade-in">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed font-normal">
            <p className="font-semibold text-amber-200">
              One or more 3x-ui server panels are currently unreachable.
            </p>
            <p className="text-[11px] text-amber-300/80">
              The system is retrying every 60 seconds and will assign waiting users once the panels recover.
            </p>
          </div>
        </div>
      )}

      {/* Segmented Tab Switcher */}
      <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 text-xs font-medium max-w-xs">
        <button
          type="button"
          onClick={() => setActiveTab('servers')}
          className={cn(
            "py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeTab === 'servers'
              ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Server size={13} />
          <span>Servers ({servers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          className={cn(
            "py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeTab === 'locations'
              ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Globe size={13} />
          <span>Regions ({locations.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SERVERS (DESKTOP LIST >= lg, CARDS < lg) */}
      {/* ========================================================================= */}
      {activeTab === 'servers' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search server name or region..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9"
            />
          </div>

          {/* 1. DESKTOP VIEW: DATA TABLE (>= lg) */}
          <div className="hidden lg:block rounded-2xl bg-zinc-900/30 border border-zinc-800/60 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/60 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-950/20">
                  <th className="py-3 px-5">Region</th>
                  <th className="py-3 px-5">Server Node</th>
                  <th className="py-3 px-5">Inbounds Capacity (Used/Limit)</th>
                  <th className="py-3 px-5">Rate / GB</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30 text-xs">
                {loadingServers ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-xs text-zinc-500 font-mono">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw size={14} className="animate-spin text-emerald-400" />
                        <span>Loading server nodes...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredServers.length > 0 ? (
                  filteredServers.map((srv) => {
                    const loc = locations.find(l => l.id === srv.location_id);
                    const inbounds = srv.inbound_limits || [];
                    const isPinging = testingServerId === srv.id;

                    return (
                      <tr key={srv.id} className="hover:bg-zinc-900/30 transition-colors group">
                        {/* Region */}
                        <td className="py-3 px-5">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-xl select-none">{loc?.flag || '🌐'}</span>
                            <div>
                              <span className="font-semibold text-zinc-200 block">{loc?.name || 'Unassigned'}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{loc?.country_code || 'N/A'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Server Name & Host */}
                        <td className="py-3 px-5">
                          <div className="min-w-0">
                            <span className="font-bold text-zinc-100 block group-hover:text-emerald-400 transition-colors">
                              {srv.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono block truncate max-w-xs">
                              {srv.api_url}
                            </span>
                          </div>
                        </td>

                        {/* Dynamic Protocol Inbound User Limits */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                            {inbounds.map((inb, i) => {
                              const isFull = (inb.used_limit || 0) >= inb.user_limit;
                              const label = inb.tag || `${inb.protocol.replace('vless_', '')}:${inb.port || 443}`;
                              return (
                                <span 
                                  key={i} 
                                  className={cn(
                                    "text-[10px] font-mono px-2 py-0.5 rounded border",
                                    isFull 
                                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                      : "bg-zinc-950 border-zinc-800 text-zinc-300"
                                  )}
                                >
                                  {label}: <strong className={isFull ? "text-rose-400" : "text-emerald-400"}>
                                    {inb.used_limit || 0}/{inb.user_limit}
                                  </strong>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Price in Toman & USD */}
                        <td className="py-3 px-5 font-mono text-zinc-200">
                          <div className="font-bold">
                            {srv.price_per_gb.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal font-sans">T / GB</span>
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-400">
                            ${(srv.price_per_gb_usd ?? 0.05).toFixed(2)} <span className="text-[10px] text-zinc-500 font-normal font-sans">/ GB</span>
                          </div>
                        </td>

                        {/* Status (Reachable vs Unreachable) */}
                        <td className="py-3 px-5">
                          {srv.is_reachable === false ? (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border bg-amber-500/10 border-amber-500/30 text-amber-400 cursor-help"
                              title={srv.last_error || "3x-ui panel is unreachable."}
                            >
                              <AlertTriangle size={10} className="mr-1 text-amber-400" />
                              Unreachable
                            </span>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border",
                              srv.is_active 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            )}>
                              <span className={cn("w-1 h-1 rounded-full mr-1.5", srv.is_active ? "bg-emerald-500" : "bg-rose-500")} />
                              {srv.is_active ? 'Online' : 'Offline'}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Fast Test Connection / Ping Button */}
                            <button
                              type="button"
                              onClick={() => handleTestConnection(srv.api_url, srv.api_token, srv.id)}
                              disabled={isPinging}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-blue-400 hover:text-blue-300 rounded-lg transition-colors cursor-pointer"
                              title="Test API Connection / Check Availability"
                            >
                              <Radio size={13} className={cn(isPinging && "animate-pulse text-blue-300")} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditServer(srv)}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Edit Server Node"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Safe Delete with Name Confirmation Pop-up */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(srv)}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete Server Node"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-xs text-zinc-500">
                      No server nodes configured. Click "Add Server Node" to connect a 3x-ui panel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 2. TABLET & MOBILE VIEW: CARDS (< lg) */}
          <div className="block lg:hidden space-y-3">
            {loadingServers ? (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading server nodes...</div>
            ) : filteredServers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredServers.map((srv) => {
                  const loc = locations.find(l => l.id === srv.location_id);
                  const inbounds = srv.inbound_limits || [];
                  const isPinging = testingServerId === srv.id;

                  return (
                    <div 
                      key={srv.id}
                      className="rounded-xl bg-zinc-900/30 border border-zinc-800/60 p-4 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="text-2xl select-none shrink-0">{loc?.flag || '🌐'}</span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-zinc-100 truncate">{srv.name}</h4>
                              <span className="text-[10px] text-zinc-500 font-mono truncate block">
                                {loc?.name || 'Unassigned'} ({loc?.country_code || 'N/A'})
                              </span>
                            </div>
                          </div>

                          {srv.is_reachable === false ? (
                            <span 
                              className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded uppercase border bg-amber-500/10 border-amber-500/30 text-amber-400 shrink-0"
                              title={srv.last_error || "Panel unreachable"}
                            >
                              Unreachable
                            </span>
                          ) : (
                            <span className={cn(
                              "px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded uppercase border shrink-0",
                              srv.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>
                              {srv.is_active ? 'Online' : 'Offline'}
                            </span>
                          )}
                        </div>

                        {/* Limits & Price */}
                        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-500">Rate:</span>
                            <span className="text-zinc-200 font-bold">
                              {srv.price_per_gb.toLocaleString()} T <span className="text-emerald-400">(${(srv.price_per_gb_usd ?? 0.05).toFixed(2)})</span> / GB
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-zinc-900 text-[10px]">
                            <span className="text-zinc-500 block font-sans">Inbounds:</span>
                            <div className="flex flex-wrap gap-1">
                              {inbounds.map((inb, idx) => (
                                <span key={idx} className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                                  {inb.tag || inb.protocol}: {inb.used_limit || 0}/{inb.user_limit}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-zinc-855/60 flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(srv.api_url, srv.api_token, srv.id)}
                          disabled={isPinging}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Test Connection"
                        >
                          <Radio size={13} className={cn(isPinging && "animate-pulse text-blue-300")} />
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleOpenEditServer(srv)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleOpenDeleteModal(srv)}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete Server"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-zinc-900/20 border border-dashed border-zinc-800 text-xs text-zinc-500">
                No server nodes found matching your search.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOCATIONS / REGIONS (With Force Delete Confirmation) */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {locations.map((loc) => {
              const serverCount = servers.filter(s => s.location_id === loc.id).length;

              return (
                <div 
                  key={loc.id}
                  className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/60 flex items-center justify-between gap-3 hover:border-zinc-750 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-2xl select-none shrink-0">{loc.flag}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-zinc-100 truncate">{loc.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Code: {loc.country_code} • {serverCount} Server(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                      title="Edit Region"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Region Force Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteLocationModal(loc)}
                      className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete region"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE SERVER FORCE DELETION (Requires re-entering server name) */}
      {/* ========================================================================= */}
      {deleteModalOpen && serverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-rose-900/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-start border-b border-zinc-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Force Delete Server Node</h3>
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Permanent Operation</span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setDeleteModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteServer} className="space-y-4 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 text-xs text-zinc-300">
                <p className="leading-relaxed">
                  Force deleting this server node will clean up its configurations from the 3X-UI panel.
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  • Users will <strong>automatically migrate</strong> to another server in this region if capacity is available.<br />
                  • If no capacity is available, users will <strong>wait for a new server</strong> to be added later.<br />
                  • All traffic usage, payments, and diagram telemetry remain <strong>completely intact</strong>.
                </p>
                <p className="text-zinc-400 text-[11px]">
                  To confirm deletion, please enter the server node name:
                </p>
                <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 font-mono text-xs font-bold text-rose-300 select-all">
                  {serverToDelete.name}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                  Re-type Server Name <span className="text-rose-400">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={serverToDelete.name}
                  value={deleteConfirmName}
                  onChange={e => setDeleteConfirmName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingServer || deleteConfirmName.trim() !== serverToDelete.name.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isDeletingServer ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Force Delete Server</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE REGION / LOCATION FORCE DELETION */}
      {/* ========================================================================= */}
      {deleteLocationModalOpen && locationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-rose-900/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-start border-b border-zinc-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Force Delete Region</h3>
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Permanent Operation</span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setDeleteLocationModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteLocation} className="space-y-4 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 text-xs text-zinc-300">
                <p className="leading-relaxed">
                  Deleting region <strong>{locationToDelete.name}</strong> will remove all server nodes and configurations associated with this region.
                </p>
                <p className="text-emerald-400 text-[11px] leading-relaxed">
                  ✓ Historical traffic usage, top-up receipts, ISP shares, and diagram telemetry are <strong>completely preserved</strong>.
                </p>
                <p className="text-zinc-400 text-[11px]">
                  To confirm deletion, please enter the region name:
                </p>
                <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 font-mono text-xs font-bold text-rose-300 select-all">
                  {locationToDelete.name}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                  Re-type Region Name <span className="text-rose-400">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={locationToDelete.name}
                  value={deleteConfirmLocationName}
                  onChange={e => setDeleteConfirmLocationName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteLocationModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingLocation || deleteConfirmLocationName.trim() !== locationToDelete.name.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isDeletingLocation ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Permanently Delete Region</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: ADD / MODIFY SERVER */}
      <AnimatePresence>
        {isServerDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex justify-end">
            <div className="absolute inset-0" onClick={() => setIsServerDrawerOpen(false)} />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-xl h-full bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto"
            >
              <div>
                <div className="p-5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950">
                  <div className="flex items-center space-x-2">
                    <Server size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-zinc-100">
                      {editingServer ? `Modify Node: ${editingServer.name}` : 'Connect 3x-ui Server Node'}
                    </h3>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setIsServerDrawerOpen(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form id="server-form" onSubmit={handleSubmitServer} className="p-5 space-y-4 text-xs">
                  
                  {/* Region Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400 block">
                      Region / Country <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={serverForm.location_id}
                      onChange={e => setServerForm({ ...serverForm, location_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer h-9"
                    >
                      <option value="">-- Choose Geographic Region --</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.flag} {loc.name} ({loc.country_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Server Node Name & Version */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Server Node Name <span className="text-rose-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Frankfurt-01 Fast Node"
                        value={serverForm.name}
                        onChange={e => setServerForm({ ...serverForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Panel Version
                      </label>
                      <select
                        value={serverForm.xui_version}
                        onChange={e => setServerForm({ ...serverForm, xui_version: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer h-9 font-mono"
                      >
                        <option value="v3.5.0">v3.5.0 (OpenAPI Clients API)</option>
                        <option value="v2.4.x (MHSanaei)">v2.4.x (MHSanaei)</option>
                        <option value="v2.5.x">v2.5.x</option>
                        <option value="v2.3.x">v2.3.x</option>
                      </select>
                    </div>
                  </div>

                  {/* 3x-ui API URL with integrated Test Connection Button */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-400 block">
                          3x-ui Panel Endpoint (URL) <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleTestConnection()}
                          disabled={testingConnection || !serverForm.api_url.trim() || !serverForm.api_token.trim()}
                          className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-blue-400 hover:text-blue-300 disabled:opacity-40 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Check if server is reachable and API is responding"
                        >
                          <Radio size={11} className={cn(testingConnection && "animate-pulse")} />
                          <span>{testingConnection ? "Pinging Panel..." : "Test Connection"}</span>
                        </button>
                      </div>

                      <input 
                        type="url" 
                        required
                        placeholder="https://example.com:2053"
                        value={serverForm.api_url}
                        onChange={e => {
                          setServerForm({ ...serverForm, api_url: e.target.value });
                          setConnectionTestResult(null);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 font-mono outline-none focus:border-zinc-700"
                      />
                    </div>

                    {connectionTestResult && (
                      <div className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-center space-x-2 animate-in fade-in",
                        connectionTestResult.status === 'success' 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {connectionTestResult.status === 'success' ? (
                          <CheckCircle2 size={14} className="shrink-0" />
                        ) : (
                          <AlertCircle size={14} className="shrink-0" />
                        )}
                        <span className="leading-snug">{connectionTestResult.message}</span>
                      </div>
                    )}

                    {/* API Token Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-400 block">
                          API Secret Token <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowApiToken(!showApiToken)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center space-x-1 cursor-pointer"
                        >
                          {showApiToken ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{showApiToken ? "Hide" : "Show"}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input 
                          type={showApiToken ? "text" : "password"} 
                          required
                          placeholder="Bearer / Secret token"
                          value={serverForm.api_token}
                          onChange={e => {
                            setServerForm({ ...serverForm, api_token: e.target.value });
                            setConnectionTestResult(null);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 font-mono tracking-wider outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dual-Currency Price Rates (IRT & USD) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Rate (Toman / GB) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          step="100"
                          required
                          value={serverForm.price_per_gb}
                          onChange={e => setServerForm({ ...serverForm, price_per_gb: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono font-bold text-zinc-100 outline-none focus:border-zinc-700"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                          T / GB
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-emerald-400 block">
                        Rate (USD / GB) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          required
                          value={serverForm.price_per_gb_usd}
                          onChange={e => setServerForm({ ...serverForm, price_per_gb_usd: parseFloat(e.target.value) || 0.05 })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono font-bold text-emerald-300 outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                          $ / GB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC MULTI-INBOUND CAPACITY MANAGER */}
                  <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu size={14} className="text-emerald-400" />
                        <span>3x-UI Inbounds & Capacities</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={handleDetectInbounds}
                          disabled={detectingInbounds}
                          className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-755 text-blue-400 hover:text-blue-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Query 3x-UI panel to auto-import inbounds"
                        >
                          <RefreshCw size={11} className={detectingInbounds ? "animate-spin" : ""} />
                          <span>{detectingInbounds ? "Detecting..." : "Detect from 3x-UI"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAddInboundRow}
                          className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-755 text-emerald-400 hover:text-emerald-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} />
                          <span>Add Inbound</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {dynamicInbounds.map((inb, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-855 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              placeholder="Label (e.g. VLESS Reality 443)"
                              value={inb.tag || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setDynamicInbounds(prev => prev.map((item, i) => i === idx ? { ...item, tag: val } : item));
                              }}
                              className="flex-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs outline-none"
                            />

                            <select
                              value={inb.protocol}
                              onChange={e => {
                                const val = e.target.value;
                                setDynamicInbounds(prev => prev.map((item, i) => i === idx ? { ...item, protocol: val } : item));
                              }}
                              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs outline-none cursor-pointer"
                            >
                              <option value="vless_reality">VLESS Reality</option>
                              <option value="xhttp">VLESS XHTTP</option>
                              <option value="vless_ws">VLESS WebSocket</option>
                              <option value="vmess">VMess</option>
                              <option value="trojan">Trojan</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveInboundRow(idx)}
                              className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                              title="Remove Inbound"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
                            <div>
                              <label className="text-[9px] text-zinc-500 block font-sans">Inbound ID</label>
                              <input
                                type="number"
                                min="1"
                                value={inb.inbound_id}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setDynamicInbounds(prev => prev.map((item, i) => i === idx ? { ...item, inbound_id: val } : item));
                                }}
                                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-zinc-500 block font-sans">Port</label>
                              <input
                                type="number"
                                min="1"
                                max="65535"
                                value={inb.port || 443}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 443;
                                  setDynamicInbounds(prev => prev.map((item, i) => i === idx ? { ...item, port: val } : item));
                                }}
                                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-zinc-500 block font-sans">Domain / Host</label>
                              <input
                                type="text"
                                placeholder="Host / SNI"
                                value={inb.domain_or_ip || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setDynamicInbounds(prev => prev.map((item, i) => i === idx ? { ...item, domain_or_ip: val } : item));
                                }}
                                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 outline-none font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-zinc-500 block font-sans">User Limit</label>
                              <input
                                type="number"
                                min={Math.max(1, inb.used_limit || 0)}
                                value={inb.user_limit}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setDynamicInbounds(prev => prev.map((item, i) => i === idx ? { ...item, user_limit: val } : item));
                                }}
                                className={cn(
                                  "w-full px-2 py-1 bg-zinc-900 border rounded font-bold outline-none",
                                  inb.user_limit < (inb.used_limit || 0)
                                    ? "border-rose-500 text-rose-400"
                                    : "border-zinc-800 text-emerald-400"
                                )}
                              />
                            </div>
                          </div>

                          {(inb.used_limit || 0) > 0 && (
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-900">
                              <span>Allocated:</span>
                              <span className="text-zinc-300 font-bold">{inb.used_limit} user(s)</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 shrink-0 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsServerDrawerOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="server-form"
                  disabled={isSubmitting || !serverForm.name.trim() || !serverForm.api_url.trim() || dynamicInbounds.length === 0}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <span>{editingServer ? 'Update Server' : 'Save & Connect Node'}</span>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT REGION */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <Globe size={16} className="text-emerald-400" />
                <span>{editingLocation ? 'Modify Region' : 'Add Geographic Region'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsLocationModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitLocation} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Region Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. United States, Germany"
                  value={locationForm.name}
                  onChange={e => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 block">Country Code</label>
                  <input 
                    type="text" 
                    required
                    maxLength={5}
                    placeholder="US, DE"
                    value={locationForm.country_code}
                    onChange={e => setLocationForm({ ...locationForm, country_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 font-mono outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 block">Flag Emoji</label>
                  <input 
                    type="text" 
                    required
                    placeholder="🇺🇸, 🇩🇪"
                    value={locationForm.flag}
                    onChange={e => setLocationForm({ ...locationForm, flag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 text-center outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {editingLocation ? 'Update Region' : 'Save Region'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
  );
}

export default Servers;