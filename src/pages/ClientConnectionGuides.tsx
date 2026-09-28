// src/pages/ClientConnectionGuides.tsx
import React, { useState } from 'react';
import { 
  Rocket, BookOpen, Download, Shield, Smartphone, 
  Laptop, AlertCircle, Copy, Check, ExternalLink
} from 'lucide-react';
import { cn } from '../components/ui/StatCard';

interface AppDownload {
  name: string;
  version: string;
  platform: 'Android' | 'iOS' | 'Windows' | 'Mac';
  icon: typeof Smartphone | typeof Laptop;
  downloadUrl: string;
  description: string;
}

const apps: AppDownload[] = [
  {
    name: 'v2rayNG',
    version: 'v1.8.5',
    platform: 'Android',
    icon: Smartphone,
    downloadUrl: 'https://github.com/2dust/v2rayNG/releases',
    description: 'The standard V2Ray client for Android with support for custom routing and auto-updating subscriptions.'
  },
  {
    name: 'Shadowrocket',
    version: 'v2.2.35',
    platform: 'iOS',
    icon: Smartphone,
    downloadUrl: 'https://apps.apple.com/us/app/shadowrocket/id932747118',
    description: 'Rule-based proxy utility client for iOS. Highly optimized for performance and minimal battery usage.'
  },
  {
    name: 'Sing-Box',
    version: 'v1.8.4',
    platform: 'iOS',
    icon: Smartphone,
    downloadUrl: 'https://apps.apple.com/us/app/sing-box-client/id6451272673',
    description: 'Universal open-source proxy toolchain supporting next-generation VLESS Reality and gRPC protocols.'
  },
  {
    name: 'v2rayN',
    version: 'v6.31',
    platform: 'Windows',
    icon: Laptop,
    downloadUrl: 'https://github.com/2dust/v2rayN/releases',
    description: 'Feature-complete GUI client for Windows with full Xray core and Trojan subscription management.'
  },
  {
    name: 'V2RayXS',
    version: 'v1.5.1',
    platform: 'Mac',
    icon: Laptop,
    downloadUrl: 'https://github.com/mcy9s/V2RayXS/releases',
    description: 'Native macOS menu bar utility for V2Ray. Lightweight, clean interface, and seamless system integration.'
  }
];

const stepsByPlatform = {
  Android: [
    {
      title: 'Download and Install v2rayNG',
      desc: 'Grab the latest v2rayNG APK from GitHub or the Google Play Store and install it on your device.'
    },
    {
      title: 'Copy Your Universal Subscription URL',
      desc: 'Click the "Copy Subscription Link" button at the top of this page to copy your universal link.'
    },
    {
      title: 'Import Link into v2rayNG',
      desc: 'Open the app, tap the ☰ menu in the top left, go to "Subscription Setting", tap the "+" button, name it (e.g., PAYG VPN), and paste your URL.'
    },
    {
      title: 'Update Subscription Nodes',
      desc: 'Return to the main screen, tap the 3 dots (⋮) in the top-right corner, and select "Update subscription" to load your servers.'
    },
    {
      title: 'Connect',
      desc: 'Choose a server node from your list, then tap the round "V" button at the bottom-right to connect.'
    }
  ],
  iOS: [
    {
      title: 'Install Shadowrocket or Sing-Box',
      desc: 'Download Shadowrocket from the App Store (requires a non-Iran Apple ID) or get the free Sing-Box client.'
    },
    {
      title: 'Copy Subscription Link or Scan QR',
      desc: 'Copy your Universal Subscription Link from the top of this page or scan the QR code from the Overview dashboard.'
    },
    {
      title: 'Import into the App',
      desc: 'In Shadowrocket: Tap "+" in the top-right, set Type to "Sub", paste the link into the URL field, and tap "Save".'
    },
    {
      title: 'Start Connection',
      desc: 'Turn on the main "Connection" toggle at the top of the screen and approve the VPN configuration prompt on your first attempt.'
    }
  ],
  Windows: [
    {
      title: 'Download v2rayN Client',
      desc: 'Download the v2rayN zip file from GitHub, extract the contents to a folder, and launch "v2rayN.exe".'
    },
    {
      title: 'Add Subscription Group',
      desc: 'Click "Subscription Group" (订阅分组) -> "Configure" -> "Add". Name it "PAYG VPN", paste your Universal Link in the URL field, and click OK.'
    },
    {
      title: 'Load Server Configurations',
      desc: 'Click "Subscription Group" again and select "Update subscription without proxy" (更新订阅) to import all nodes.'
    },
    {
      title: 'Enable System Proxy',
      desc: 'Right-click the v2rayN icon in your Windows system tray, select "System Proxy" -> "Set System Proxy" (Automatic), and verify the icon turns red.'
    }
  ],
  Mac: [
    {
      title: 'Install V2RayXS or Foxray',
      desc: 'Download V2RayXS from GitHub or get Foxray / Sing-Box directly from the Mac App Store.'
    },
    {
      title: 'Add Subscription Group',
      desc: 'Open the menu bar settings, navigate to subscription settings, and add a new group with your Universal Subscription Link.'
    },
    {
      title: 'Update Nodes & Connect',
      desc: 'Click "Update Subscription" to pull active node configurations, select your preferred location, and turn V2Ray on.'
    }
  ]
};

export function ClientConnectionGuides() {
  const [activeTab, setActiveTab] = useState<'Android' | 'iOS' | 'Windows' | 'Mac'>('Android');
  const [copiedLink, setCopiedLink] = useState(false);
  const universalLink = "https://payg-vpn.net/sub/arash_df7g8h467ks8";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(universalLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentSteps = stepsByPlatform[activeTab];
  const currentApps = apps.filter(app => app.platform === activeTab);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Page Header & Universal Link Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Rocket size={20} className="text-emerald-400" />
            <span>Connection Guides & Apps</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Download recommended client apps and configure your universal auto-sync subscription link.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 shadow-xs",
            copiedLink 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-zinc-100 hover:bg-white text-zinc-950"
          )}
        >
          {copiedLink ? <Check size={13} /> : <Copy size={13} />}
          <span>{copiedLink ? 'Link Copied!' : 'Copy Subscription Link'}</span>
        </button>
      </div>

      {/* Segmented Platform Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 text-xs font-medium">
        {(['Android', 'iOS', 'Windows', 'Mac'] as const).map((platform) => {
          const isActive = activeTab === platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => setActiveTab(platform)}
              className={cn(
                "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
                isActive 
                  ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs" 
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {platform === 'Android' && <Smartphone size={14} />}
              {platform === 'iOS' && <Smartphone size={14} />}
              {platform === 'Windows' && <Laptop size={14} />}
              {platform === 'Mac' && <Laptop size={14} />}
              <span>{platform}</span>
            </button>
          );
        })}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        
        {/* Step-by-Step Instructions Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-5">
            <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-3">
              <BookOpen size={15} className="text-emerald-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                {activeTab} Setup Instructions
              </h3>
            </div>

            {/* Clean Timeline */}
            <div className="space-y-4 relative pl-3 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-[1px] before:bg-zinc-800/70">
              {currentSteps.map((step, idx) => (
                <div key={idx} className="flex space-x-3.5 relative group">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400 flex items-center justify-center shrink-0 z-10">
                    0{idx + 1}
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <h4 className="text-xs font-bold text-zinc-200">
                      {step.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Troubleshooting Notice */}
          <div className="p-3.5 bg-zinc-900/20 border border-zinc-800/50 rounded-xl flex items-start space-x-2.5 text-xs text-zinc-400">
            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold text-zinc-200 block">Connection Troubleshooting</span>
              <p className="text-[11px] text-zinc-400">
                If a server node displays timeout, ensure your client supports VLESS Reality / gRPC. Switch server locations in your client app to find the lowest latency node.
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Apps Column (1 Col) */}
        <div className="space-y-4">
          
          <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-3.5">
            <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-2.5">
              <Download size={15} className="text-emerald-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Recommended Apps
              </h3>
            </div>

            <div className="space-y-3 divide-y divide-zinc-800/30">
              {currentApps.map((app, idx) => {
                const IconComp = app.icon;
                return (
                  <div key={idx} className={cn("pt-3 first:pt-0 space-y-2")}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                          <IconComp size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-bold text-zinc-100 truncate">{app.name}</h4>
                            <span className="text-[9px] text-zinc-500 font-mono">{app.version}</span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={app.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors inline-flex items-center space-x-1 shrink-0"
                        title={`Download ${app.name}`}
                      >
                        <span>Get App</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                      {app.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick FAQ Widget */}
          <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-3">
            <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-2.5">
              <Shield size={14} className="text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Frequently Asked Questions
              </h3>
            </div>
            
            <div className="space-y-2.5 text-xs text-zinc-400">
              <div className="space-y-0.5">
                <span className="font-medium text-zinc-200 block">Do I need to update configs manually?</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  No. Tapping "Update Subscription" in your client app automatically pulls all working server nodes.
                </p>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-zinc-800/30">
                <span className="font-medium text-zinc-200 block">Which app has the best performance?</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Shadowrocket for iOS and v2rayNG for Android are highly stable and battery-efficient.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default ClientConnectionGuides;