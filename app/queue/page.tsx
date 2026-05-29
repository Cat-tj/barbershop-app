'use client'

export default function QueuePage() {
  // Simple queue display — designed for TV/monitor casting
  // For now: empty state. Admin integration later.

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-6">
      <div className="text-center space-y-6 max-w-md">
        {/* Now serving */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Sekarang</p>
          <p className="text-4xl sm:text-5xl font-bold text-zinc-300">—</p>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800 w-32 mx-auto" />

        {/* Up next */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Berikutnya</p>
          <p className="text-xl sm:text-2xl text-zinc-600">Tidak ada antrian</p>
        </div>

        {/* Queue list */}
        <div className="space-y-1 mt-6">
          <p className="text-sm text-zinc-700">Antrian kosong</p>
        </div>
      </div>
    </div>
  )
}
