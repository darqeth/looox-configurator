export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
        <div className="h-7 w-36 bg-lx-divider rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-48 bg-lx-divider rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-lx-divider rounded-xl animate-pulse" />
          <div className="h-32 bg-lx-divider rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
