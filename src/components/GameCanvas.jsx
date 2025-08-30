import { useEffect, useRef, useState } from 'react'

// Original tile art via code. No external assets.
// Game constants
const TILE = 16
const SCALE = 3
const VIEW_W = 320 // logical pixels
const VIEW_H = 180
const CANVAS_W = VIEW_W * SCALE
const CANVAS_H = VIEW_H * SCALE
const GRAVITY = 0.35
const FRICTION = 0.85
const MAX_RUN = 1.8
const ACCEL = 0.15
const JUMP_VEL = -5.4

// Tile legend
// ' ' empty, '#' ground, '=' platform, '?' coin block, 'B' brick, 'P' pipe, 'F' flagpole, 'G' goal
// 'C' cloud deco, 'T' tree deco, 'S' start marker

const makeLevel = () => {
  // A fresh, original level: similar teaching beats (run, jump, first enemy, coin block, staircase, flag) but custom layout
  const rows = [
    '                                                                                                                                              ',
    '                           C       C           C                                                                                                ',
    '                C                                                                                                                              ',
    '                                                                                                                                              F',
    '                                                                                                                                              F',
    '                                      ==                                                                                                      F',
    '                                 ==         ==                                                                                                 F',
    '                                                                                                                                                ',
    '                 ?                                                                                                                              ',
    '                                    B   B   B      ?                                                                                            ',
    '        T             ?                                                                                                                         ',
    '                                                                                                                                               G',
    '                                                                                                                                                ',
    '                                                                                                                                                ',
    'S                                                                                                                                               ',
    '###############################################################################################################################################',
  ]
  return rows
}

// Simple PRNG for enemy behavior variations
function rng(seed) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}

function drawPixelArt(ctx, x, y, size, palette, pattern) {
  // pattern is 2D array of palette indices
  const px = Math.floor(size / pattern[0].length)
  for (let j = 0; j < pattern.length; j++) {
    for (let i = 0; i < pattern[0].length; i++) {
      const idx = pattern[j][i]
      if (idx === -1) continue
      ctx.fillStyle = palette[idx]
      ctx.fillRect((x + i * px) | 0, (y + j * px) | 0, px, px)
    }
  }
}

function useKeys() {
  const keys = useRef({})
  useEffect(() => {
    const d = (e, v) => {
      const k = e.key.toLowerCase()
      if (['arrowleft', 'a'].includes(k)) keys.current.left = v
      if (['arrowright', 'd'].includes(k)) keys.current.right = v
      if ([' ', 'z', 'k'].includes(k)) keys.current.jump = v
      if (k === 'p') keys.current.pause = v
    }
    const kd = e => d(e, true)
    const ku = e => d(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])
  return keys
}

function tileAt(level, tx, ty) {
  if (ty < 0) return ' '
  if (ty >= level.length) return '#'
  const row = level[ty]
  if (tx < 0 || tx >= row.length) return '#'
  return row[tx]
}

function rectVsWorld(level, x, y, w, h) {
  // returns collision info and resolves axis by axis
  const result = { x, y, grounded: false, hit: [] }
  // Horizontal
  let nx = x
  if (w > 0) {
    const dir = Math.sign(w)
    nx += w
    const left = Math.min(x, nx)
    const right = Math.max(x, nx)
    const top = y
    const bottom = y + h
    const minTx = Math.floor(left / TILE)
    const maxTx = Math.floor((right - 0.001) / TILE)
    const minTy = Math.floor(top / TILE)
    const maxTy = Math.floor((bottom - 0.001) / TILE)
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = tileAt(level, tx, ty)
        if ('#=BPFG'.includes(t)) {
          const txw = tx * TILE
          if (dir > 0) nx = Math.min(nx, txw - (x + h >= 0 ? 0 : 0) - (right - left))
          if (dir < 0) nx = Math.max(nx, txw + TILE - left)
        }
      }
    }
  }
  // Vertical
  let ny = y
  if (h > 0) {
    const dir = Math.sign(h)
    ny += h
    const left = nx
    const right = nx + TILE
    const top = Math.min(y, ny)
    const bottom = Math.max(y, ny)
    const minTx = Math.floor(left / TILE)
    const maxTx = Math.floor((right - 0.001) / TILE)
    const minTy = Math.floor(top / TILE)
    const maxTy = Math.floor((bottom - 0.001) / TILE)
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = tileAt(level, tx, ty)
        if ('#=BPFG'.includes(t)) {
          const tyh = ty * TILE
          if (dir > 0) {
            ny = Math.min(ny, tyh - (y + (bottom - top)))
            result.grounded = true
          }
          if (dir < 0) {
            ny = Math.max(ny, tyh + TILE - top)
            // bump bricks/blocks only if hitting the underside
            if (t === 'B' || t === '?') result.hit.push({ tx, ty, type: t })
          }
        }
      }
    }
  }
  return result
}

function drawBackground(ctx, camX) {
  // Sky gradient is handled by CSS background; here we draw parallax clouds and decor
  const w = VIEW_W
  const h = VIEW_H
  ctx.save()
  ctx.scale(SCALE, SCALE)

  // distant mountains
  ctx.fillStyle = '#2f5e9e'
  for (let i = -1; i < 20; i++) {
    const mx = i * 64 - (camX * 0.2) % 64
    ctx.beginPath()
    ctx.moveTo(mx, h - 24)
    ctx.lineTo(mx + 24, h - 56)
    ctx.lineTo(mx + 48, h - 24)
    ctx.closePath()
    ctx.fill()
  }

  // clouds
  ctx.fillStyle = '#ffffffcc'
  for (let i = -2; i < 30; i++) {
    const cx = i * 80 - (camX * 0.4) % 80
    const cy = 24 + (i % 3) * 10
    ctx.beginPath()
    ctx.ellipse(cx, cy, 14, 8, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + 10, cy + 2, 10, 6, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - 10, cy + 2, 10, 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawTile(ctx, t, px, py) {
  // draw a single tile at pixel position (in world pixels, not scaled)
  const x = px * SCALE
  const y = py * SCALE
  const s = TILE * SCALE
  // ground
  if (t === '#') {
    ctx.fillStyle = '#5c3b1a'
    ctx.fillRect(x, y, s, s)
    ctx.fillStyle = '#7a4a20'
    ctx.fillRect(x, y + s - 6, s, 6)
  } else if (t === '=') {
    ctx.fillStyle = '#7a4a20'
    ctx.fillRect(x, y, s, s)
    ctx.fillStyle = '#93622f'
    ctx.fillRect(x + 2, y + 2, s - 4, s - 10)
  } else if (t === 'B') {
    ctx.fillStyle = '#c26a2e'
    ctx.fillRect(x, y, s, s)
    ctx.fillStyle = '#9b4f1d'
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) ctx.fillRect(x + 2 + i * (s / 2), y + 2 + j * (s / 2), s / 2 - 4, s / 2 - 4)
  } else if (t === '?') {
    ctx.fillStyle = '#e3b341'
    ctx.fillRect(x, y, s, s)
    ctx.fillStyle = '#9f7b1f'
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4)
    ctx.fillStyle = '#fff3'
    ctx.fillRect(x + 4, y + 4, s - 8, s - 8)
  } else if (t === 'P') {
    ctx.fillStyle = '#2fa34a'
    ctx.fillRect(x, y, s, s)
    ctx.fillStyle = '#1c6e30'
    ctx.fillRect(x + s / 4, y + s / 4, s / 2, s - s / 4)
  } else if (t === 'F') {
    // flag pole
    ctx.fillStyle = '#dfe7ec'
    ctx.fillRect(x + s - 5, y - s * 3, 3, s * 4)
  } else if (t === 'G') {
    // goal base
    ctx.fillStyle = '#2fa34a'
    ctx.fillRect(x, y, s, s)
  } else if (t === 'T') {
    // tree decor
    ctx.fillStyle = '#2fa34a'
    ctx.fillRect(x + s / 3, y - s, s / 3, s)
    ctx.beginPath()
    ctx.fillStyle = '#37c25a'
    ctx.arc(x + s / 2, y - s, s / 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function GameCanvas({ started, paused, onHudChange, onGameOver }) {
  const canvasRef = useRef(null)
  const keys = useKeys()
  const [seed] = useState(() => Math.floor(Math.random() * 1e9))

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: false })

    // Game state
    const level = makeLevel()
    let score = 0
    let coins = 0
    let time = 400
    let lives = 3

    // find start
    let startX = 2 * TILE, startY = 0
    for (let y = 0; y < level.length; y++) {
      const x = level[y].indexOf('S')
      if (x !== -1) {
        startX = x * TILE
        startY = (y - 1) * TILE
        // remove S marker
        level[y] = level[y].replace('S', ' ')
        break
      }
    }

    const player = { x: startX, y: startY, vx: 0, vy: 0, w: 14, h: 16, onGround: false, inv: 0 }
    const enemies = []
    const rand = rng(seed)

    // spawn some baddies on ground across the level
    for (let tx = 20; tx < level[0].length - 10; tx += 12) {
      // find ground y
      for (let ty = 0; ty < level.length; ty++) {
        if (tileAt(level, tx, ty) === '#' && tileAt(level, tx, ty - 1) === ' ') {
          enemies.push({ type: 'shroom', x: tx * TILE + 2, y: (ty - 2) * TILE, vx: (rand() > 0.5 ? -0.5 : 0.5), vy: 0, w: 12, h: 12, alive: true })
          break
        }
      }
    }

    const camera = { x: 0 }

    function setHud() {
      onHudChange({ score, coins, time, lives, world: '1-1' })
    }

    function resetPlayer() {
      player.x = startX
      player.y = startY
      player.vx = 0
      player.vy = 0
      player.inv = 60
      camera.x = Math.max(0, player.x - 40)
    }

    resetPlayer()
    setHud()

    let raf = 0
    let last = performance.now()

    function update(dt) {
      if (!started || paused) return
      // timer
      time -= dt / 1000
      if (time <= 0) {
        lives--
        if (lives <= 0) onGameOver?.()
        time = 400
        resetPlayer()
        setHud()
      }

      // input
      const k = keys.current
      if (k?.pause) {
        // handled in App via button; ignore here to avoid toggling flicker
      }

      const move = (k?.right ? 1 : 0) - (k?.left ? 1 : 0)
      player.vx += move * ACCEL
      player.vx *= player.onGround ? FRICTION : 0.98
      player.vx = Math.max(-MAX_RUN, Math.min(MAX_RUN, player.vx))

      // jump
      if (k?.jump && player.onGround) {
        player.vy = JUMP_VEL
        player.onGround = false
      }

      // gravity
      player.vy += GRAVITY
      if (player.vy > 8) player.vy = 8

      // move and collide
      const nx = rectVsWorld(level, player.x, player.y, player.vx, 0)
      player.x = nx.x
      const ny = rectVsWorld(level, player.x, player.y, 0, player.vy)
      player.y = ny.y
      player.onGround = ny.grounded

      // handle head hits
      if (ny.hit.length) {
        for (const h of ny.hit) {
          const t = tileAt(level, h.tx, h.ty)
          if (t === 'B') {
            // break brick
            const row = level[h.ty]
            level[h.ty] = row.substring(0, h.tx) + ' ' + row.substring(h.tx + 1)
            score += 50
          } else if (t === '?') {
            // coin popup (turn into empty block)
            const row = level[h.ty]
            level[h.ty] = row.substring(0, h.tx) + ' ' + row.substring(h.tx + 1)
            coins += 1
            score += 200
          }
        }
      }

      // enemies
      for (const e of enemies) {
        if (!e.alive) continue
        e.vy += GRAVITY
        e.x += e.vx
        // turn at edges or walls
        const aheadLeft = tileAt(level, Math.floor((e.x - 1) / TILE), Math.floor((e.y + e.h) / TILE))
        const aheadRight = tileAt(level, Math.floor((e.x + e.w + 1) / TILE), Math.floor((e.y + e.h) / TILE))
        const wallLeft = tileAt(level, Math.floor((e.x - 1) / TILE), Math.floor(e.y / TILE))
        const wallRight = tileAt(level, Math.floor((e.x + e.w + 1) / TILE), Math.floor(e.y / TILE))
        if (e.vx < 0 && (wallLeft !== ' ' || aheadLeft === ' ')) e.vx = Math.abs(e.vx)
        if (e.vx > 0 && (wallRight !== ' ' || aheadRight === ' ')) e.vx = -Math.abs(e.vx)
        e.y += e.vy
        // ground collision
        const ty = Math.floor((e.y + e.h) / TILE)
        const txl = Math.floor((e.x) / TILE)
        const txr = Math.floor((e.x + e.w) / TILE)
        for (let tx = txl; tx <= txr; tx++) {
          if ('#=BPFG'.includes(tileAt(level, tx, ty))) {
            e.y = ty * TILE - e.h
            e.vy = 0
            break
          }
        }

        // player vs enemy
        if (rectOverlap(player, e)) {
          if (player.vy > 0 && player.y + player.h - e.y < 10) {
            // stomp
            e.alive = false
            score += 100
            player.vy = JUMP_VEL * 0.7
          } else if (player.inv <= 0) {
            lives--
            if (lives <= 0) {
              onGameOver?.()
              return
            }
            resetPlayer()
          }
        }
      }

      // remove dead enemies
      for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1)

      // collect loose coins (represented by standalone '?')
      // Already handled on hit, but we could add floating coins later

      // goal check: touching goal tile 'G'
      const ptx = Math.floor((player.x + player.w / 2) / TILE)
      const pty = Math.floor((player.y + player.h / 2) / TILE)
      if (tileAt(level, ptx, pty) === 'G' || tileAt(level, ptx + 1, pty) === 'G') {
        score += 1000
        time += 50
        resetPlayer()
      }

      if (player.inv > 0) player.inv--

      // camera follows player, never moves backward past 0
      camera.x = Math.max(camera.x, player.x - 80)

      setHud()
    }

    function render() {
      // clear
      ctx.fillStyle = '#1b2a41'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      drawBackground(ctx, camera.x)

      ctx.save()
      ctx.translate(-Math.floor(camera.x) * SCALE, 0)

      // draw terrain
      for (let y = 0; y < level.length; y++) {
        const row = level[y]
        for (let x = 0; x < row.length; x++) {
          const t = row[x]
          if (t !== ' ') drawTile(ctx, t, x * TILE, y * TILE)
        }
      }

      // draw player
      const px = Math.floor(player.x)
      const py = Math.floor(player.y)
      const palette = ['#ffd25a', '#f25e3d', '#2fa34a', '#1b1b1b', '#ffffff']
      const pattern = [
        [-1,1,1,1,1,-1],
        [1,1,0,0,1,1],
        [1,0,0,0,0,1],
        [2,2,2,2,2,2],
        [2,2,2,2,2,2],
        [3,3,3,3,3,3],
      ]
      const size = 18 * SCALE
      const jitter = player.inv > 0 && (Math.floor(player.inv / 4) % 2 === 0)
      if (!jitter) drawPixelArt(ctx, (px - 1) * SCALE, (py - 6) * SCALE, size, palette, pattern)

      // draw enemies
      for (const e of enemies) {
        if (!e.alive) continue
        const ep = [
          [1,1,1,1],
          [1,0,0,1],
          [1,1,1,1],
          [2,2,2,2],
        ]
        drawPixelArt(ctx, Math.floor(e.x) * SCALE, Math.floor(e.y) * SCALE, 14 * SCALE, ['#9b4f1d', '#e07a3f', '#4a2b12'], ep)
      }

      ctx.restore()

      // vignette
      ctx.fillStyle = '#00000010'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    }

    function loop(now) {
      const dt = Math.min(50, now - last)
      last = now
      if (started && !paused) update(dt)
      render()
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    const onResize = () => {
      // keep fixed pixel-perfect canvas; CSS scales container
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [started, paused, onGameOver, onHudChange, seed])

  return (
    <div className="w-full grid place-items-center p-2 bg-[linear-gradient(to_bottom,#2c5aa0,#0a1a2b)]">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full h-auto max-w-full image-render-pixel"
      />
    </div>
  )
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
