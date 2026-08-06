'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface QrisScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (scannedPayload: string) => void
}

export default function QrisScannerModal({ isOpen, onClose, onScanSuccess }: QrisScannerModalProps) {
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
      setScanResult(null)
      setErrorMsg(null)
      return
    }

    // Initialize HTML5 QR Code Scanner
    const timeout = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          false
        )

        scanner.render(
          (decodedText) => {
            setScanResult(decodedText)
            onScanSuccess(decodedText)
            scanner.clear().catch(() => {})
          },
          (errorMessage) => {
            // Ignore normal scanning frame errors
          }
        )

        scannerRef.current = scanner
      } catch (err) {
        console.error('Failed to init camera scanner:', err)
        setErrorMsg('Gagal membuka kamera. Pastikan izin kamera telah diberikan di browser.')
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isOpen, onScanSuccess])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">Scan QRIS Merchant Kamera</h3>
            <p className="text-xs text-zinc-400">Arahkan kamera ke kode QRIS Statis Toko/Merchant</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {scanResult ? (
          <div className="flex flex-col items-center py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-zinc-100">QRIS Berhasil Di-Scan!</h4>
            <p className="text-xs font-mono text-amber-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 break-all max-h-24 overflow-y-auto">
              {scanResult}
            </p>
            <button
              onClick={() => {
                onClose()
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
            >
              Gunakan QRIS Ini
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div id="qr-reader-container" className="overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-zinc-950" />
            <p className="text-[11px] text-center text-zinc-500">
              Posisikan QR code tepat di dalam kotak pemindai kamera
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
