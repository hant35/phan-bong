export default function GroupsLoading() {
  return (
    <div>
      <div className="skeleton h-36 rounded-3xl mb-5" />
      <div className="skeleton h-20 rounded-2xl mb-5" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
      </div>
    </div>
  )
}
