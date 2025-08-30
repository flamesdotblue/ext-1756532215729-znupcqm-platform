export default function Controls({ className = '' }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/5 p-4 ${className}`}>
      <div className="text-sm text-white/90">
        <div className="font-semibold mb-2">Controls</div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-1">
          <li>Move: Arrow Keys or A/D</li>
          <li>Jump: Z, K, or Space</li>
          <li>Pause: P or top-right button</li>
        </ul>
      </div>
    </div>
  )
}
