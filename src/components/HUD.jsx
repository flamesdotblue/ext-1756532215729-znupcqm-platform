export default function HUD({ score = 0, coins = 0, time = 400, lives = 3, world = '1-1' }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-sm md:text-base font-semibold tracking-wide select-none mb-3">
      <div className="flex items-center gap-2">
        <span className="uppercase text-white/80">Score</span>
        <span className="tabular-nums">{score.toString().padStart(6, '0')}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="uppercase text-white/80">Coins</span>
        <span className="tabular-nums">{coins}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="uppercase text-white/80">World</span>
        <span>{world}</span>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <span className="uppercase text-white/80">Time</span>
        <span className="tabular-nums">{Math.max(0, Math.floor(time))}</span>
      </div>
      <div className="col-span-4 text-right text-white/70 -mt-2">Lives: {lives}</div>
    </div>
  )
}
