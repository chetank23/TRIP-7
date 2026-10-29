'use client';

import React, { useState } from 'react';
import { useTrip } from '@/lib/trip-context';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export function PdfViewerModal() {
  const { activePdfDoc, closePdfViewer } = useTrip();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [hasError, setHasError] = useState<boolean>(false);

  if (!activePdfDoc) return null;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  // Safe file URL for streaming
  const viewUrl = activePdfDoc.fileUrl.startsWith('http')
    ? activePdfDoc.fileUrl
    : `/api/documents/file?id=${activePdfDoc.id}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A181B] text-white flex flex-col animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#242126] border-b border-[#353139]">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            type="button"
            onClick={closePdfViewer}
            className="w-9 h-9 rounded-full bg-[#353139] flex items-center justify-center hover:bg-[#453F4B] transition-colors"
            aria-label="Back to documents"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h2 className="text-sm font-semibold truncate leading-tight">{activePdfDoc.title}</h2>
            <p className="text-[11px] text-gray-400">
              {activePdfDoc.category} · {(activePdfDoc.fileSize / 1024).toFixed(0)} KB · by{' '}
              {activePdfDoc.uploadedBy}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={viewUrl}
            download={activePdfDoc.fileName}
            className="w-9 h-9 rounded-full bg-[#353139] flex items-center justify-center hover:bg-[#453F4B] transition-colors"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </a>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-[#353139] flex items-center justify-center hover:bg-[#453F4B] transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main PDF Content Viewport */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-[#121113]">
        {hasError ? (
          <div className="text-center p-6 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-base font-bold mb-1">Preview not available</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Your device browser cannot render this PDF inline. You can download it directly.
            </p>
            <a
              href={viewUrl}
              download={activePdfDoc.fileName}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-bvc-red text-white text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              <span>Download {activePdfDoc.fileName}</span>
            </a>
          </div>
        ) : (
          <div
            className="w-full h-full max-w-4xl flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            <object
              data={`${viewUrl}#toolbar=0&navpanes=0`}
              type="application/pdf"
              className="w-full h-full rounded-xl bg-white shadow-2xl border border-gray-700 min-h-[500px]"
              onError={() => setHasError(true)}
            >
              {/* Fallback iframe */}
              <iframe
                src={`${viewUrl}#toolbar=0`}
                className="w-full h-full rounded-xl bg-white min-h-[500px]"
                title={activePdfDoc.title}
                onError={() => setHasError(true)}
              />
            </object>
          </div>
        )}
      </div>

      {/* Bottom Floating Dark Toolbar (Matching Screen 6) */}
      <div className="p-3 bg-[#242126] border-t border-[#353139] flex justify-center">
        <div className="inline-flex items-center bg-[#1A181B] rounded-full px-4 py-2 space-x-4 border border-[#3A3540] shadow-floating">
          <span className="text-xs font-medium text-gray-300">
            {currentPage} / {totalPages}
          </span>
          <div className="w-[1px] h-4 bg-gray-700" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="text-gray-300 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-gray-400">{zoomLevel}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="text-gray-300 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-gray-700" />
          <button
            type="button"
            onClick={handleResetZoom}
            className="text-gray-300 hover:text-white transition-colors"
            title="Fit to width"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
