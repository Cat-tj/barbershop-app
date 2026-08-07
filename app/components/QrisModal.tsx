'use client'

import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, CheckCircle2, Loader2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react'

interface QrisModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  orderId?: string | number
  customerName?: string
  onSuccess: (paymentDetails: { refId: string; method: 'qris' }) => void
}

export default function QrisModal({
  isOpen,
  onClose,
  amount,
  orderId,
  customerName = 'Pelanggan',
  onSuccess,
}: QrisModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [refId, setRefId] = useState<string>('')
  const [status, setStatus] = useState<'pending' | 'checking' | 'success'>('pending')
  const [timeLeft, setTimeLeft] = useState<number>(300) // 5 Minutes countdown

  useEffect(() => {
    if (!isOpen) {
      setStatus('pending')
      setTimeLeft(300)
      return
    }

    const generatedRefId = `QRIS-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`
    setRefId(generatedRefId)

    // Fetch static QRIS payload from settings & convert to dynamic QRIS via verssache/qris-dinamis logic
    fetch('/api/admin/qris')
      .then((res) => res.json())
      .then((data) => {
        const staticPayload = data.qris_static_payload || ''
        import('@/lib/qris').then(({ generateDynamicQris }) => {
          const qrisPayload = generateDynamicQris(staticPayload, amount)
          QRCode.toDataURL(qrisPayload, {
            width: 320,
            margin: 2,
            color: {
              dark: '#09090b',
              light: '#ffffff',
            },
          })
            .then((url) => setQrUrl(url))
            .catch((err) => console.error('Failed to generate QR code:', err))
        })
      })
      .catch(() => {
        import('@/lib/qris').then(({ generateDynamicQris }) => {
          const fallback = generateDynamicQris('', amount)
          QRCode.toDataURL(fallback, { width: 320, margin: 2 }).then(setQrUrl)
        })
      })

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, amount])

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function handleCheckPayment() {
    setStatus('checking')
    // Simulate real-time payment gateway verification callback
    setTimeout(() => {
      setStatus('success')
      setTimeout(() => {
        onSuccess({ refId, method: 'qris' })
        onClose()
      }, 1200)
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-200 pb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Pembayaran QRIS Altora
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-500 border border-purple-500/30">
                Instant
              </span>
            </h3>
            <p className="text-xs text-slate-500">Scan QRIS pakai GoPay, OVO, Dana, BCA, Mandiri, dll.</p>
          </div>
        </div>

        {/* Status: Pending / Checking */}
        {status !== 'success' ? (
          <div className="flex flex-col items-center">
            {/* Amount Banner */}
            <div className="w-full bg-[#f8f7fc]/80 border border-slate-200/80 rounded-xl p-3 mb-5 text-center">
              <span className="text-xs text-slate-500 block mb-0.5">Total Tagihan ({customerName})</span>
              <span className="text-2xl font-extrabold text-purple-500">
                Rp {amount.toLocaleString('id-ID')}
              </span>
            </div>

            {/* QR Container */}
            <div className="p-3 bg-white rounded-2xl shadow-inner border-4 border-purple-500/30 mb-4 flex items-center justify-center">
              {qrUrl ? (
                <img src={qrUrl} alt="QRIS Code" className="w-60 h-60 rounded-lg" />
              ) : (
                <div className="w-60 h-60 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>

            {/* Timer & Info */}
            <div className="flex items-center justify-between w-full text-xs text-slate-500 mb-5 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                Ref: <strong className="text-slate-800 font-mono">{refId}</strong>
              </span>
              <span className="font-mono font-medium text-purple-500 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                Batas: {formatTime(timeLeft)}
              </span>
            </div>

            {/* Verification Button */}
            <button
              onClick={handleCheckPayment}
              disabled={status === 'checking'}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 transition-all active:scale-[0.98]"
            >
              {status === 'checking' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa Status Pembayaran...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Cek / Verifikasi Pembayaran</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Status: Success */
          <div className="flex flex-col items-center py-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-1">Pembayaran QRIS Berhasil!</h4>
            <p className="text-xs text-slate-500 mb-4">
              Transaksi ID: <span className="font-mono text-slate-800">{refId}</span>
            </p>
            <span className="text-2xl font-extrabold text-emerald-400">
              Rp {amount.toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
