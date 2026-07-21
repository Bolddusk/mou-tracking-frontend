import { PORTAL_LOGO_PATH } from '../../constants/branding'

const SIZES = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-32 w-32',
  xl: 'h-48 w-48',
  '2xl': 'h-64 w-64',
  hero: 'h-full w-full',
}

export default function PortalLogo({ size = 'md', className = '' }) {
  return (
    <img
      src={PORTAL_LOGO_PATH}
      alt="MNFSR"
      className={`${SIZES[size] || SIZES.md} shrink-0 rounded-full object-cover ${className}`}
    />
  )
}
