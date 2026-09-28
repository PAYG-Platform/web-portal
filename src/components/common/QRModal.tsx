// src/components/common/QRModal.tsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { QRCodeView } from './QRCodeView';

export interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  qrValue?: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  title = 'Universal Subscription QR Code',
  qrValue = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center justify-center space-y-4 py-2">
        <QRCodeView value={qrValue} size={180} />
        <p className="text-xs text-zinc-400 text-center max-w-xs">
          Scan this QR Code with v2rayNG, Shadowrocket, Sing-Box, or NekoBox to import configurations directly.
        </p>
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-300 truncate max-w-[260px] mr-2 select-all">
            {qrValue}
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCopy} 
            icon={copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};