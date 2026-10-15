/**
 * Shared inline SVG icon set for MediGuide.
 *
 * Dependency-free (no icon library to install) and fully themeable: every icon
 * inherits `currentColor`, so size it with `className="h-5 w-5"` and colour it
 * with any Tailwind text colour, e.g. `text-brand-600`.
 *
 * Teammates: add new icons here rather than inlining SVGs in feature files so
 * the whole app keeps a single visual language.
 */

const SVG_BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

function Icon({ className = 'h-5 w-5', children, ...rest }) {
  return (
    <svg {...SVG_BASE} className={className} {...rest}>
      {children}
    </svg>
  )
}

/**
 * MediGuide logo mark: an ECG trace inside a rounded brand-blue tile.
 * Colours come from the Tailwind theme so they stay in sync with `brand`.
 */
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" className="fill-brand-600" />
      <path
        d="M8.5 21.5h5.2l2.7-7 4.3 13.5 3.2-9.2 2 2.7h5.6"
        className="stroke-white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const HomeIcon = (props) => (
  <Icon {...props}>
    <path d="M3 9.75 12 3l9 6.75V19.5A1.5 1.5 0 0 1 19.5 21h-15A1.5 1.5 0 0 1 3 19.5z" />
    <path d="M9.25 21v-6.5h5.5V21" />
  </Icon>
)

export const UserIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="3.75" />
    <path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0" />
  </Icon>
)

export const PillIcon = (props) => (
  <Icon {...props}>
    <g transform="rotate(-45 12 12)">
      <rect x="2.75" y="8.75" width="18.5" height="6.5" rx="3.25" />
      <path d="M12 8.75v6.5" />
    </g>
  </Icon>
)

export const CalendarIcon = (props) => (
  <Icon {...props}>
    <rect x="3.25" y="4.75" width="17.5" height="16" rx="2.5" />
    <path d="M8 2.75v3.5M16 2.75v3.5M3.25 9.75h17.5" />
    <path d="M7.5 13.5h2M14.5 13.5h2M7.5 17h2M14.5 17h2" />
  </Icon>
)

export const ChatIcon = (props) => (
  <Icon {...props}>
    <path d="M20.5 11.75a8 8 0 0 1-8.75 7.95 9 9 0 0 1-2.6-.4L4 21l1.15-3.6A7.9 7.9 0 0 1 3.5 11.75 8.25 8.25 0 0 1 11.75 3.5h.5a8.25 8.25 0 0 1 8.25 8.25z" />
    <path d="M8.75 11.75h6.5" />
  </Icon>
)

export const MenuIcon = (props) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
)

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const ArrowRightIcon = (props) => (
  <Icon {...props}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Icon>
)

export const AlertTriangleIcon = (props) => (
  <Icon {...props}>
    <path d="M10.3 4.02 2.6 17.4A1.95 1.95 0 0 0 4.3 20.4h15.4a1.95 1.95 0 0 0 1.7-3L13.7 4.02a1.95 1.95 0 0 0-3.4 0z" />
    <path d="M12 9.5v4M12 17h.01" />
  </Icon>
)

export const ShieldCheckIcon = (props) => (
  <Icon {...props}>
    <path d="M12 21.5s7.75-3.4 7.75-9.25V5.6L12 2.75 4.25 5.6v6.65C4.25 18.1 12 21.5 12 21.5z" />
    <path d="M9.25 12.1l1.95 1.95 3.7-3.9" />
  </Icon>
)

export const ActivityIcon = (props) => (
  <Icon {...props}>
    <path d="M21.5 12h-4l-2.75 7.5L8.5 4.5 6 12h-3.5" />
  </Icon>
)

export const LockIcon = (props) => (
  <Icon {...props}>
    <rect x="4.75" y="10.25" width="14.5" height="10.5" rx="2.25" />
    <path d="M8.25 10.25V7.5a3.75 3.75 0 0 1 7.5 0v2.75" />
  </Icon>
)
