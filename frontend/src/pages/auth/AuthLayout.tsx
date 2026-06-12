import { useEffect, useRef } from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

const SLOGANS = [
  'Suas notas te esperam.',
  'Um mural só seu.',
  'Pensamentos organizados, mente livre.',
  'Anote. Organize. Lembre.',
  'Suas ideias jamais se perdem.',
]

const POSTIT_COLORS = ['#8a8a30', '#FFFF99', '#ce3975', '#af651b', '#a9b529', '#3c7bbf', '#c7637a']
const POSTIT_TOTAL  = 32

interface Postit {
  x: number; y: number; size: number; color: string
  speed: number; drift: number; angle: number; spin: number; opacity: number
}

function criarPostit(w: number, h: number): Postit {
  return {
    x:       Math.random() * w,
    y:       Math.random() * -h,
    size:    Math.random() * 14 + 10,
    color:   POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)],
    speed:   Math.random() * 0.6 + 0.3,
    drift:   (Math.random() - 0.5) * 0.4,
    angle:   Math.random() * Math.PI * 2,
    spin:    (Math.random() - 0.5) * 0.012,
    opacity: Math.random() * 0.35 + 0.25,
  }
}

function desenharPostit(ctx: CanvasRenderingContext2D, p: Postit) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  ctx.globalAlpha   = p.opacity
  ctx.shadowColor   = 'rgba(0,0,0,0.12)'
  ctx.shadowBlur    = 3
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 2
  ctx.fillStyle     = p.color
  ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
  const fold = p.size * 0.28
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.beginPath()
  ctx.moveTo( p.size / 2 - fold, -p.size / 2)
  ctx.lineTo( p.size / 2,        -p.size / 2 + fold)
  ctx.lineTo( p.size / 2 - fold, -p.size / 2 + fold)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

let _postitsCached: Postit[] | null = null

function CanvasPostits() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const redimensionar = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    redimensionar()
    window.addEventListener('resize', redimensionar)

    if (!_postitsCached) {
      _postitsCached = Array.from({ length: POSTIT_TOTAL }, () =>
        criarPostit(window.innerWidth, window.innerHeight)
      )
    }
    const postits = _postitsCached

    const animar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of postits) {
        p.y += p.speed; p.x += p.drift; p.angle += p.spin
        if (p.y > canvas.height + p.size) {
          p.y = -p.size * 2
          p.x = Math.random() * canvas.width
        }
        desenharPostit(ctx, p)
      }
      rafRef.current = requestAnimationFrame(animar)
    }
    animar()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', redimensionar)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}

function TypewriterSlogan() {
  const textoRef  = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const textoEl  = textoRef.current
    const cursorEl = cursorRef.current
    if (!textoEl || !cursorEl) return

    let sloganIdx = 0
    let pos       = 0
    let typing    = true
    let timerId   = 0

    const tick = () => {
      const slogan = SLOGANS[sloganIdx]
      if (typing) {
        if (pos < slogan.length) {
          textoEl.textContent = slogan.substring(0, ++pos)
          timerId = window.setTimeout(tick, 60)
        } else {
          timerId = window.setTimeout(() => { typing = false; tick() }, 2200)
        }
      } else {
        if (pos > 0) {
          textoEl.textContent = slogan.substring(0, --pos)
          timerId = window.setTimeout(tick, 28)
        } else {
          sloganIdx = (sloganIdx + 1) % SLOGANS.length
          typing    = true
          timerId   = window.setTimeout(tick, 400)
        }
      }
    }
    tick()

    const cursorId = window.setInterval(() => {
      cursorEl.style.opacity = cursorEl.style.opacity === '0' ? '1' : '0'
    }, 500)

    return () => { clearTimeout(timerId); clearInterval(cursorId) }
  }, [])

  return (
    <p style={{
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: 300,
      fontFamily: "'Poppins', sans-serif",
      color: 'rgba(50, 20, 90, 0.55)',
      margin: '6px 0 24px',
      minHeight: '20px',
      letterSpacing: '0.01em',
    }}>
      <span ref={textoRef} />
      <span ref={cursorRef} aria-hidden="true" style={{ opacity: 1 }}>|</span>
    </p>
  )
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1,
      background: 'linear-gradient(155deg, #d4b8d4 0%, #e2cde2 45%, #eddaed 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1rem 1rem 4rem',
      overflowY: 'auto',
    }}>

      <CanvasPostits />

      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: '400px',
      }}>
        <article style={{
          position: 'relative',
          background: 'rgba(112, 88, 159, 0.45)',
          backdropFilter: 'blur(16px) saturate(1.4) brightness(1.08)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4) brightness(1.08)',
          width: '100%', borderRadius: '24px',
          padding: '36px 32px 32px',
          border: '1px solid rgba(255, 255, 255, 0.70)',
          boxShadow: [
            '0 2px 0 0 rgba(255,255,255,0.80) inset',
            '0 -1px 0 0 rgba(255,255,255,0.15) inset',
            '1px 0 0 0 rgba(255,255,255,0.50) inset',
            '-1px 0 0 0 rgba(255,255,255,0.50) inset',
            '0 24px 64px rgba(120,80,180,0.20)',
            '0 4px 16px rgba(0,0,0,0.10)',
          ].join(', '),
        }}>

          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '50%', borderRadius: '24px 24px 60% 60%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <TypewriterSlogan />
            {children}
          </div>
        </article>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, width: '100%',
        textAlign: 'center', padding: '12px 0',
        fontSize: '14px', fontWeight: 300,
        fontFamily: "'Poppins', sans-serif",
        color: 'rgba(88, 28, 135, 0.60)',
        zIndex: 900,
      }}>
        © Copyright 2026 Mynotes
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
