import { getMeubelModel } from '@/lib/meubel-config'

// Icoon van een product in de lijsten: bij een spiegel de vorm, bij Tailor-Made de
// categorie (wastafelmeubel, kast, plank, waskom, enzovoort).

const SPIEGEL_ICONEN = ['rechthoek', 'rond', 'organic', 'rounded-rect', 'ovaal', 'elips', 'arc', 'sol', 'luna', 'op-aanvraag', 'projectspiegel']

export function productIcoon(selectedOptions: unknown): string {
  const opts = (selectedOptions ?? {}) as { shape?: unknown; meubel?: { modelId?: unknown } }
  if (opts.shape === 'meubel') {
    const model = getMeubelModel(String(opts.meubel?.modelId ?? ''))
    return `/icons/shapes/meubel-${model?.categorie ?? 'wastafelmeubels'}.svg`
  }
  const shape = typeof opts.shape === 'string' && SPIEGEL_ICONEN.includes(opts.shape) ? opts.shape : 'rechthoek'
  return `/icons/shapes/${shape}.svg`
}
