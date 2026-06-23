import { PORTAL_LOGO_PATH } from '../../constants/branding'

const SIZES = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-32 w-32',
  xl: 'h-48 w-48',
  '2xl': 'h-64 w-64',
  hero: 'h-80 w-80',
}

export default function PortalLogo({ size = 'md', className = '' }) {
  return (
    <img
      src={PORTAL_LOGO_PATH}
      alt="State Emblem of Pakistan"
      className={`${SIZES[size] || SIZES.md} shrink-0 object-contain ${className}`}
    />
  )
}
