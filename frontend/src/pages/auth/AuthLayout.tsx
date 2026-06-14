import { useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'

interface AuthLayoutProps {
  children: React.ReactNode
  rodape?: React.ReactNode
}

const POSTIT_COLORS_BG = ['#8a8a30', '#FFFF99', '#ce3975', '#af651b', '#a9b529', '#3c7bbf', '#c7637a']
const POSTIT_TOTAL     = 32

interface Postit {
  x: number; y: number; size: number; color: string
  speed: number; drift: number; angle: number; spin: number; opacity: number
}

function criarPostit(w: number, h: number): Postit {
  return {
    x:       Math.random() * w,
    y:       Math.random() * -h,
    size:    Math.random() * 14 + 10,
    color:   POSTIT_COLORS_BG[Math.floor(Math.random() * POSTIT_COLORS_BG.length)],
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
  const r = p.size * 0.18
  ctx.beginPath()
  ctx.moveTo(-p.size / 2 + r, -p.size / 2)
  ctx.arcTo( p.size / 2, -p.size / 2,  p.size / 2,  p.size / 2, r)
  ctx.arcTo( p.size / 2,  p.size / 2, -p.size / 2,  p.size / 2, r)
  ctx.arcTo(-p.size / 2,  p.size / 2, -p.size / 2, -p.size / 2, r)
  ctx.arcTo(-p.size / 2, -p.size / 2,  p.size / 2, -p.size / 2, r)
  ctx.closePath()
  ctx.fill()
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
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}

function PaperFilters() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="paper-envelope" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.60" numOctaves="4" seed="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" in="noise" result="tint" />
          <feComposite in="tint" in2="SourceGraphic" operator="over" />
        </filter>
        <filter id="paper-postit" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="5" seed="11" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.14 0" in="noise" result="tint" />
          <feComposite in="tint" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

function TexturaOverlay({ filterId, borderRadius = 0 }: { filterId: string; borderRadius?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        filter: `url(#${filterId})`,
        pointerEvents: 'none',
        zIndex: 10,
        background: 'rgba(255,255,255,0.01)',
      }}
    />
  )
}

const ENVELOPE_W = 360
const ENVELOPE_H = 480
const CARD_W     = 150
const CARD_H     = 150

let _animacaoJaRodou = false

const LEQUE_COLORS = [
  '#EEAAA9', '#EBC861', '#dcf06b', '#81BB71',
  '#3FB0D8', '#AB75B3', '#F1902C', '#E84439',
]

const LEQUE_OFFSET  = -1
const LEQUE_RAIO    = 48
const LEQUE_ANGULOS = [-1, -30, -52, -72, -89, -105, -119, -132].map(a => a + LEQUE_OFFSET)

function PostitsLeque({ jaRodou }: { jaRodou: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: jaRodou ? 0 : 0.09,
            delayChildren:   jaRodou ? 0 : 2.12,
          },
        },
      }}
      style={{
        position: 'absolute',
        bottom: 180,
        right: 285,
        width: 0,
        height: 0,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      {LEQUE_COLORS.map((cor, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: jaRodou
              ? {
                  rotate:  LEQUE_ANGULOS[i],
                  x: Math.cos((LEQUE_ANGULOS[i] - 90) * Math.PI / 180) * LEQUE_RAIO * i * 0.4,
                  y: Math.sin((LEQUE_ANGULOS[i] - 90) * Math.PI / 180) * LEQUE_RAIO * i * 0.4 - CARD_H * 0.9,
                  opacity: 1, scale: 1,
                }
              : { rotate: 0, x: 0, y: 0, opacity: 0, scale: 0.7 },
            show: {
              rotate:  LEQUE_ANGULOS[i],
              x: Math.cos((LEQUE_ANGULOS[i] - 90) * Math.PI / 180) * LEQUE_RAIO * i * 0.4,
              y: Math.sin((LEQUE_ANGULOS[i] - 90) * Math.PI / 180) * LEQUE_RAIO * i * 0.4 - CARD_H * 0.9,
              opacity: 1, scale: 1,
              transition: jaRodou
                ? { duration: 0 }
                : { type: 'spring', stiffness: 120, damping: 18, mass: 1.1 },
            },
          }}
          style={{
            position: 'absolute',
            width: CARD_W,
            height: CARD_H,
            background: cor,
            borderRadius: 15,
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
            transformOrigin: 'bottom right',
            bottom: 0,
            right: 0,
            zIndex: LEQUE_COLORS.length - 1 - i,
            overflow: 'hidden',
          }}
        >
          <TexturaOverlay filterId="paper-postit" borderRadius={15} />
        </motion.div>
      ))}
    </motion.div>
  )
}

function AbaEnvelope({ jaRodou }: { jaRodou: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ rotateY: jaRodou ? -160 : 0 }}
      animate={{ rotateY: -160 }}
      transition={jaRodou ? { duration: 0 } : { delay: 1.52, duration: 0.60, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'absolute',
        top: 0,
        left: 3,
        width: '54%',
        height: '101%',
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
        zIndex: 2,
        pointerEvents: 'none',
        clipPath: 'polygon(0% 0%, 0% 100%, 100% 50%)',
        background: 'rgba(228,218,242,0.97)',
        boxShadow: 'inset -2px 0 8px rgba(140,110,190,0.25)',
        borderRadius: '0px 0 0 16px',
        overflow: 'hidden',
      }}
    >
      <TexturaOverlay filterId="paper-envelope" />
    </motion.div>
  )
}

function EnvelopeAnimado({ children }: { children: React.ReactNode }) {
  const jaRodou = _animacaoJaRodou
  const controls = useAnimation()

  useEffect(() => {
    if (jaRodou) return
    _animacaoJaRodou = true
    controls.start({
      rotate: 0,
      opacity: 1,
      transition: { delay: 0.8, duration: 0.72, ease: [0.4, 0, 0.2, 1] },
    })
  }, [])

  return (
    <motion.div
      initial={jaRodou ? { rotate: 0, opacity: 1 } : { rotate: 90, opacity: 1 }}
      animate={jaRodou ? { rotate: 0, opacity: 1 } : controls}
      style={{
        position: 'relative',
        width: ENVELOPE_W,
        height: ENVELOPE_H,
        zIndex: 2,
        perspective: 1000,
      }}
    >
      {/* Verso do envelope */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(232,224,245,0.98)',
          borderRadius: '0 16px 16px 0',
          border: '1px solid rgba(180,158,210,0.75)',
          boxShadow: [
            '0 2px 0 rgba(255,255,255,0.90) inset',
            '0 32px 80px rgba(100,60,170,0.28)',
            '0 4px 20px rgba(0,0,0,0.14)',
          ].join(', '),
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${ENVELOPE_W} ${ENVELOPE_H}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <path d={`M 0 ${ENVELOPE_H} L ${ENVELOPE_W * 0.40} ${ENVELOPE_H * 0.50} L ${ENVELOPE_W} ${ENVELOPE_H} Z`} fill="rgba(190,168,220,0.30)" />
          <path d={`M ${ENVELOPE_W} 0 L ${ENVELOPE_W * 0.60} ${ENVELOPE_H * 0.50} L ${ENVELOPE_W} ${ENVELOPE_H} Z`} fill="rgba(190,168,220,0.22)" />
        </svg>
        <TexturaOverlay filterId="paper-envelope" />
      </div>

      <AbaEnvelope jaRodou={jaRodou} />
      <PostitsLeque jaRodou={jaRodou} />

      {/* Frente do envelope */}
      <motion.div
        initial={{ opacity: jaRodou ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={jaRodou ? { duration: 0 } : { delay: 1.52, duration: 0.40, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(245,241,252,0.97)',
          borderRadius: '0 16px 16px 0',
          border: '1px solid rgba(180,158,210,0.75)',
          boxShadow: '0 2px 0 rgba(255,255,255,0.90) inset, 0 8px 32px rgba(100,60,170,0.18)',
          zIndex: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 32px 32px',
          overflow: 'hidden',
        }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${ENVELOPE_W} ${ENVELOPE_H}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
        >
          <path d={`M 0 ${ENVELOPE_H} L ${ENVELOPE_W * 0.40} ${ENVELOPE_H * 0.50} L ${ENVELOPE_W} ${ENVELOPE_H} Z`} fill="rgba(190,168,220,0.22)" />
          <path d={`M ${ENVELOPE_W} 0 L ${ENVELOPE_W * 0.60} ${ENVELOPE_H * 0.50} L ${ENVELOPE_W} ${ENVELOPE_H} Z`} fill="rgba(190,168,220,0.16)" />
        </svg>
        <TexturaOverlay filterId="paper-envelope" />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', paddingBottom: '40px' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function AuthLayout({ children, rodape }: AuthLayoutProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1,
      background: 'linear-gradient(155deg, #d4b8d4 0%, #e2cde2 45%, #eddaed 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <PaperFilters />
      <CanvasPostits />

      <EnvelopeAnimado>
        {children}
      </EnvelopeAnimado>

      {/* Rodapé abaixo do envelope — fora do overflow:hidden */}
      {rodape && (
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 300,
          fontFamily: 'Poppins, sans-serif',
          color: 'rgba(60,20,100,0.70)',
          zIndex: 10,
          position: 'relative',
        }}>
          {rodape}
        </div>
      )}

      <footer style={{
        position: 'fixed', bottom: 0, width: '100%',
        textAlign: 'center', padding: '12px 0',
        fontSize: '14px', fontWeight: 300,
        fontFamily: 'Poppins, sans-serif',
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
