export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8">
        <rect width="32" height="32" rx="9" fill={light ? '#ffffff1a' : '#0b1f3a'} />
        <path d="M16 26V14" stroke="#00c805" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M16 15c0-4 3-7 8-7 0 4-3 7-8 7Z" fill="#00c805" />
        <path d="M16 18c0-3-2.4-5.5-6.5-5.5 0 3.2 2.4 5.5 6.5 5.5Z" fill="#7be07e" />
      </svg>
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand'}`}>Hạt Giống</span>
    </div>
  )
}
