export default function IntroModal({ onStart }) {
  return (
    <div className="p-6 md:p-8 text-center">
      <div className="text-2xl md:text-3xl font-extrabold mb-2">Plumber Quest</div>
      <p className="text-white/80 mb-6 max-w-md mx-auto">
        Dash through a sunny overworld, bop baddies, and snag shiny coins in this original retro platformer.
        New graphics, new level design, same timeless feel.
      </p>
      <button
        onClick={onStart}
        className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-black shadow hover:brightness-95 active:brightness-90"
      >
        Start World 1-1
      </button>
    </div>
  )
}
