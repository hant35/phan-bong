export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-xl font-black text-white">Không có mạng</h1>
      <p className="text-white/40 text-sm max-w-xs">
        Kiểm tra lại kết nối internet của bạn để xem kết quả trận đấu mới nhất.
      </p>
    </div>
  )
}
