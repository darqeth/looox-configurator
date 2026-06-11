// Drie standen per account (epic EN/EN, besluit B1):
//   'maatwerk' — alleen de maatwerk-wizard (default)
//   'beide'    — typekeuze bij nieuwe configuratie
//   'project'  — alleen de projectspiegel-configurator (vml. is_groothandel)
// De DB houdt is_groothandel gesynchroniseerd via een trigger zolang er nog
// oude code draait die de boolean leest.

export type ConfiguratorAccess = 'maatwerk' | 'beide' | 'project'

export function parseConfiguratorAccess(v: unknown): ConfiguratorAccess {
  return v === 'beide' || v === 'project' ? v : 'maatwerk'
}

export const ACCESS_LABELS: Record<ConfiguratorAccess, string> = {
  maatwerk: 'Maatwerk',
  beide: 'Maatwerk + Project',
  project: 'Alleen project',
}
