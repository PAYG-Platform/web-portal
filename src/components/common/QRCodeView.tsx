// src/components/common/QRCodeView.tsx
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 160,
  className = '',
}) => {
  const trimmedValue = (value || '').trim();

  if (!trimmedValue) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs font-mono rounded-xl border border-zinc-200 mx-auto ${className}`}
      >
        No Data
      </div>
    );
  }

  return (
    <div className={`p-3.5 bg-white rounded-2xl shadow-sm inline-block border border-zinc-200 mx-auto ${className}`}>
      <QRCodeSVG
        value={trimmedValue}
        size={size}
        bgColor="#ffffff"
        fgColor="#09090b"
        level="M"
        includeMargin={false}
      />
    </div>
  );
};

export default QRCodeView;