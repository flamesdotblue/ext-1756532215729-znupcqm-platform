import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import Controls from './components/Controls'
import IntroModal from './components/IntroModal'

export default function App() {
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hud, setHud] = useState({ score: 0, coins: 0, time: 400, lives: 3, world: '1-1' })

  const handleStart = () => {
    setStarted(true)
    setPaused(false)
  }

  const handleTogglePause = () => {
    if (!started) return
    setPaused(p => !p)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-900 text-white font-['Inter','IBM Plex Sans','Manrope',sans-serif]">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="inline-block bg-yellow-400 text-slate-900 px-2 py-1 rounded shadow-sm">Retro</span>
            <span className="opacity-90">Plumber Quest</span>
          </h1>
          <button
            onClick={handleTogglePause}
            className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition text-sm border border-white/10"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>

        <HUD {...hud} />

        <div className="relative rounded-lg overflow-hidden ring-1 ring-white/10 shadow-2xl bg-slate-900/40 backdrop-blur">
          <GameCanvas
            started={started}
            paused={paused}
            onHudChange={setHud}
            onGameOver={() => setStarted(false)}
          />
          {!started && (
            <div className="absolute inset-0 grid place-items-center bg-slate-900/60">
              <IntroModal onStart={handleStart} />
            </div>
          )}
        </div>

        <Controls className="mt-6" />

        <footer className="mt-8 text-xs text-white/70 text-center">
          An original retro platformer homage with new art, level design, and names.
        </footer>
      </div>
    </div>
  )
}
