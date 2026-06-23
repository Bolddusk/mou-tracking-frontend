import { formatUpdateRequestLabel } from '../utils/proposalDisplay'

const STYLES = {
  none: 'bg-slate-50 text-slate-400 border-slate-100',
  pending_response: 'bg-amber-50 text-amber-800 border-amber-200',
  answered: 'bg-green-50 text-green-800 border-green-200',
}

const ON_DARK_STYLES = {
  none: 'text-slate-500',
  pending_response: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
  answered: 'bg-green-400/20 text-green-200 border-green-400/40',
}

export default function PokeStatusBadge({ pokeStatus, variant = 'default' }) {
  const isNone = !pokeStatus || pokeStatus.status === 'none'

  if (isNone) {
    const noneClass = variant === 'onDark' ? ON_DARK_STYLES.none : 'text-xs text-slate-400'
    return <span className={`text-xs ${noneClass}`}>—</span>
  }

  const palette = variant === 'onDark' ? ON_DARK_STYLES : STYLES
  const style = palette[pokeStatus.status] || palette.none

  return (
    <span
      title={pokeStatus.label}
      className={`inline-flex max-w-[220px] rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-snug ${style}`}
    >
      {formatUpdateRequestLabel(pokeStatus.short_label)}
    </span>
  )
}
