'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, CheckCircle2, AlertCircle, Upload, SwitchCamera } from 'lucide-react'

interface QrisScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (scannedPayload: string) => void
}

export default function QrisScannerModal({ isOpen, onClose, onScanSuccess }: QrisScannerModalProps) {
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch (e) {
        console.error('Error stopping scanner:', e)
      }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
  }

  const startScanner = async (cameraId?: string) => {
    await stopScanner()
    setErrorMsg(null)

    try {
      const qrScanner = new Html5Qrcode('qr-reader-container')
      html5QrCodeRef.current = qrScanner

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' }

      await qrScanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setScanResult(decodedText)
          onScanSuccess(decodedText)
          stopScanner()
        },
        () => {}
      )
      setIsScanning(true)
    } catch (err) {
      console.error('Failed to start camera:', err)
      setErrorMsg('Gagal menyalakan kamera. Pastikan memberikan izin kamera pada browser HP kamu atau gunakan tombol "Upload Gambar QRIS".')
    }
  }

  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setScanResult(null)
      setErrorMsg(null)
      setCameras([])
      return
    }

    const initCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` })))
          // Prefer back camera if available
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'))
          const targetId = backCam ? backCam.id : devices[0].id
          setSelectedCameraId(targetId)
          await startScanner(targetId)
        } else {
          await startScanner()
        }
      } catch (err) {
        console.warn('Camera enumeration error, trying facingMode:', err)
        await startScanner()
      }
    }

    const timer = setTimeout(() => {
      initCameras()
    }, 200)

    return () => {
      clearTimeout(timer)
      stopScanner()
    }
  }, [isOpen])

  const handleSwitchCamera = async (newCamId: string) => {
    setSelectedCameraId(newCamId)
    await startScanner(newCamId)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await stopScanner()
      const html5QrCode = new Html5Qrcode('qr-reader-file-temp')
      const result = await html5QrCode.scanFile(file, true)
      setScanResult(result)
      onScanSuccess(result)
      html5QrCode.clear()
    } catch (err) {
      console.error('File scan error:', err)
      setErrorMsg('Gagal membaca QR code dari gambar. Gunakan foto QRIS yang lebih terang dan jelas.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl overflow-hidden space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Scan / Upload QRIS Merchant</h3>
            <p className="text-xs text-slate-500">Kamera HP Live atau Upload File Gambar QRIS</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {scanResult ? (
          <div className="flex flex-col items-center py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">QRIS Berhasil Terbaca!</h4>
            <p className="text-xs font-mono text-amber-400 bg-[#f8f8fc] p-3 rounded-xl border border-slate-200 break-all max-h-28 overflow-y-auto w-full">
              {scanResult}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20"
            >
              Gunakan Payload QRIS Ini
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Camera Switcher Selector if multiple cameras exist */}
            {cameras.length > 1 && (
              <div className="flex items-center justify-between bg-[#f8f8fc] p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <SwitchCamera className="w-3.5 h-3.5 text-amber-400" /> Pilih Kamera HP:
                </span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  className="bg-white text-xs text-amber-400 font-bold border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video Container */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-[#f8f8fc] min-h-[260px] flex items-center justify-center">
              <div id="qr-reader-container" className="w-full" />
            </div>

            <div id="qr-reader-file-temp" className="hidden" />

            {/* Upload Fallback Option */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all shadow-md"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Upload Foto / Screenshot QRIS</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
