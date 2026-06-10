import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-lx-divider flex items-center justify-center p-6">
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-8 max-w-md w-full text-center">
        <p className="text-[32px] font-bold text-lx-text-primary mb-1">404</p>
        <h1 className="text-[16px] font-bold text-lx-text-primary mb-1.5">Pagina niet gevonden</h1>
        <p className="text-[13px] text-lx-text-secondary leading-relaxed mb-5">
          Deze pagina bestaat niet (meer), of je hebt er geen toegang toe.
        </p>
        <Link
          href="/dashboard"
          className="px-5 h-10 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors inline-flex items-center"
        >
          Naar dashboard
        </Link>
      </div>
    </div>
  )
}
