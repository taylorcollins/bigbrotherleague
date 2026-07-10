const SIZE = {
  sm: "w-8 h-8 text-caption",
  md: "w-11 h-11 text-label",
  lg: "w-14 h-14 text-subheadline",
  xl: "w-20 h-20 text-headline",
}

export default function Avatar({ src, initials, size = "md", color = "bg-brand-secondary" }) {
  return (
    <div className={`${SIZE[size]} ${src ? "" : color} shrink-0 rounded-full overflow-hidden flex items-center justify-center`}>
      {src
        ? <img src={src} alt={initials} className="w-full h-full object-cover" />
        : <span className="font-semibold text-white leading-none">{initials}</span>
      }
    </div>
  )
}
