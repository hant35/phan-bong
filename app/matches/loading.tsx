export default function MatchesLoading() {
  return (
    <div>
      <div className="skeleton h-52 rounded-3xl mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
      </div>
      <div className="skeleton h-11 rounded-xl mb-3" />
      <div className="flex gap-2 mb-5">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-8 w-20 rounded-full" />)}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    </div>
  )
}
