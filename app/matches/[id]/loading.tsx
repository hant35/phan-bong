export default function MatchDetailLoading() {
  return (
    <div>
      <div className="skeleton h-5 w-24 rounded-lg mb-4" />
      <div className="skeleton h-48 rounded-3xl mb-5" />
      <div className="skeleton h-32 rounded-2xl mb-5" />
      <div className="skeleton h-12 rounded-2xl mb-5" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
      <div className="skeleton h-32 rounded-2xl" />
    </div>
  )
}
