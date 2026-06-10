export default function LeaderboardLoading() {
  return (
    <div>
      <div className="skeleton h-36 rounded-3xl mb-5" />
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
