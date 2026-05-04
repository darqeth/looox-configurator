export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full animate-pulse">
      <div className="h-8 w-44 bg-white rounded-xl mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-[18px] h-36" />
        ))}
      </div>
    </div>
  )
}
