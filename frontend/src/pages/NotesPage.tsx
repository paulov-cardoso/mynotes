import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'
import { spacing, typography } from '../design/tokens'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Note {
  id: number
  titulo: string
  tituloCapa: string
  conteudo: string
  cor: string
  data: string
  imagemCapa: string | null
  clips: number
  canvasX: number
  canvasY: number
  canvasOrdem: number
}

interface Bloco {
  id: number
  nome: string
  cardIds: number[]
  cards: Note[]
  canvasX: number
  canvasY: number
  canvasOrdem: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CARD_W       = 260
const CARD_H       = 220
const GRID_COL     = 280
const GRID_ROW     = 260
const ZOOM_MIN     = 0.35
const ZOOM_MAX     = 2.0
const ZOOM_STEP    = 0.12
const ZOOM_DEFAULT = 1.0
const CANVAS_GAP   = 48
const BUFFER_PX    = 300

const GRID_DOT_COLOR  = 'rgba(120, 80, 160, 0.18)'
const GRID_DOT_RADIUS = 1.5

// ─── Pure helpers ───────────────────────────────────────────────────────────

function snapToGrid(x: number, y: number) {
  return {
    x: Math.round(x / GRID_COL) * GRID_COL,
    y: Math.round(y / GRID_ROW) * GRID_ROW,
  }
}

// ─── BotaoZoom ──────────────────────────────────────────────────────────────

interface BotaoZoomProps {
  label: string
  title: string
  onClick: () => void
  width?: number
  height?: number
  fontSize?: number
}

function BotaoZoom({ label, title, onClick, width = 42, height = 42, fontSize = 18 }: BotaoZoomProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width, height,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(255,255,255,0.70)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 10px rgba(120,80,160,0.22)',
        cursor: 'pointer',
        color: '#5b4080',
        fontFamily: typography.fontFamily.primary,
        fontSize,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.85)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)' }}
    >{label}</button>
  )
}

// ─── TexturaCanvas ──────────────────────────────────────────────────────────

function TexturaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width  = CARD_W
    canvas.height = CARD_H
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(CARD_W, CARD_H)
    const px  = img.data
    for (let y = 0; y < CARD_H; y++) {
      for (let x = 0; x < CARD_W; x++) {
        const idx    = (y * CARD_W + x) * 4
        const grain  = Math.random()
        const stripe = (Math.sin(y * 0.4 + Math.random() * 0.6) + 1) / 2
        const diag   = (Math.sin((x + y) * 0.08) + 1) / 2
        const val    = Math.floor((grain * 0.55 + stripe * 0.30 + diag * 0.15) * 255)
        px[idx] = px[idx + 1] = px[idx + 2] = val
        px[idx + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        borderRadius: 'inherit',
        opacity: 0.18,
        mixBlendMode: 'soft-light',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

// ─── IconeMuralPrivado ──────────────────────────────────────────────────────

function IconeMuralPrivado({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mural-grad" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6b4e9e" />
          <stop offset="50%" stopColor="#a978b0" />
          <stop offset="100%" stopColor="#c9967a" />
        </linearGradient>
        <linearGradient id="mural-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="48" height="48" rx="4" fill="url(#mural-grad)" />
      <path d="M38 2 L50 14 L38 14 Z" fill="url(#mural-fold)" />
      <rect x="18" y="27" width="16" height="13" rx="3" fill="rgba(255,255,255,0.92)" />
      <path
        d="M20 27 V22 C20 18.134 32 18.134 32 22 V27"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="26" cy="33" r="2.2" fill="url(#mural-grad)" />
      <rect x="25" y="33" width="2" height="3.5" rx="1" fill="url(#mural-grad)" />
    </svg>
  )
}

// ─── CardBoasVindas ─────────────────────────────────────────────────────────

interface CardBoasVindasProps {
  camX: number
  camY: number
  zoom: number
  containerRef: RefObject<HTMLDivElement | null>
}

function CardBoasVindas({ camX, camY, zoom, containerRef }: CardBoasVindasProps) {
  const container = containerRef.current
  const viewW = container ? container.getBoundingClientRect().width  : window.innerWidth
  const viewH = container ? container.getBoundingClientRect().height : window.innerHeight

  const centroX = (-camX + viewW / 2) / zoom - CARD_W / 2
  const centroY = (-camY + viewH / 2) / zoom - CARD_H / 2

  return (
    <div
      style={{
        position: 'absolute',
        left: centroX,
        top: centroY,
        width: CARD_W,
        height: CARD_H,
        borderRadius: spacing.cardRadius,
        background: 'linear-gradient(155deg, #9b7bc4 0%, #c79bd1 45%, #f0c9a8 100%)',
        border: '1px solid rgba(255,255,255,0.35)',
        boxShadow: '0 12px 36px rgba(120,80,160,0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '20px 24px',
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <TexturaCanvas />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <IconeMuralPrivado size={52} />
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: typography.fontFamily.primary,
            fontSize: 13,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            margin: '0 0 7px',
            lineHeight: 1.3,
          }}>
            Bem-vindo ao seu mural infinito
          </p>
          <p style={{
            fontFamily: typography.fontFamily.primary,
            fontSize: 10.5,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.70)',
            margin: 0,
            lineHeight: 1.6,
          }}>
            Crie e arraste quantos notes forem necessarios. Comece quando quiser clicando em{' '}
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>Criar novo note</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── LapisSVG ───────────────────────────────────────────────────────────────

function LapisSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// ─── NotesPage ──────────────────────────────────────────────────────────────

export function NotesPage() {
  const [camX, setCamX] = useState(CANVAS_GAP)
  const [camY, setCamY] = useState(CANVAS_GAP)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)

  const [zoomExpanded, setZoomExpanded] = useState(false)

  const [busca, setBusca]                 = useState('')
  const [buscaExpanded, setBuscaExpanded] = useState(false)
  const buscaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (buscaExpanded) buscaInputRef.current?.focus()
  }, [buscaExpanded])

  function toggleBusca() {
    if (buscaExpanded) {
      setBuscaExpanded(false)
      setBusca('')
    } else {
      setBuscaExpanded(true)
    }
  }

  function zoomIn()    { setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))) }
  function zoomOut()   { setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))) }
  function zoomReset() { setZoom(ZOOM_DEFAULT); setCamX(CANVAS_GAP); setCamY(CANVAS_GAP) }

  const containerRef = useRef<HTMLDivElement>(null)
  const panRef       = useRef(false)
  const panStart     = useRef({ x: 0, y: 0, camX: 0, camY: 0 })

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0) return
    panRef.current = true
    panStart.current = { x: e.clientX, y: e.clientY, camX, camY }
    e.preventDefault()
  }, [camX, camY])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!panRef.current) return
      setCamX(panStart.current.camX + (e.clientX - panStart.current.x))
      setCamY(panStart.current.camY + (e.clientY - panStart.current.y))
    }
    function onUp() {
      panRef.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    setZoom(prev => {
      const proximo = prev + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, proximo))
    })
  }, [])

  useEffect(() => {
    const elemento = containerRef.current
    if (!elemento) return
    elemento.addEventListener('wheel', onWheel, { passive: false })
    return () => elemento.removeEventListener('wheel', onWheel)
  }, [onWheel])

  return (
    <>
      <style>{`
        @keyframes zoomExpand {
          from { opacity: 0; transform: scale(0.85) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
          background: 'linear-gradient(155deg, #d4b8d4 0%, #e2cde2 45%, #eddaed 100%)',
        }}
      >
        {/* Grid de pontos */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle, ${GRID_DOT_COLOR} ${GRID_DOT_RADIUS}px, transparent ${GRID_DOT_RADIUS}px)`,
            backgroundSize: `${GRID_COL * zoom}px ${GRID_ROW * zoom}px`,
            backgroundPosition: `${camX}px ${camY}px`,
            pointerEvents: 'none',
          }}
        />

        {/* Camada do canvas — todos os cards e blocos vivem aqui */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${camX}px, ${camY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          <CardBoasVindas camX={camX} camY={camY} zoom={zoom} containerRef={containerRef} />
        </div>

        {/* Pill de busca */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
          <div style={{
            background: buscaExpanded ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(16px)',
            borderRadius: buscaExpanded ? 14 : 999,
            border: '1px solid rgba(255,255,255,0.60)',
            boxShadow: buscaExpanded ? '0 8px 28px rgba(120,80,160,0.25)' : 'none',
            transition: 'border-radius 0.2s, background 0.2s, box-shadow 0.2s',
            minWidth: buscaExpanded ? 320 : undefined,
          }}>
            <div
              style={{ display: 'flex', alignItems: 'center', padding: buscaExpanded ? '0 14px' : '7px 16px', gap: 8, cursor: buscaExpanded ? 'default' : 'pointer' }}
              onClick={!buscaExpanded ? toggleBusca : undefined}
            >
              <span style={{ fontSize: 13, opacity: 0.55 }}>🔍</span>
              {buscaExpanded
                ? <input
                    ref={buscaInputRef}
                    type="text"
                    placeholder="Buscar notes..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: typography.fontFamily.primary, fontSize: 13, color: '#4a3470', padding: '11px 0', minWidth: 240 }}
                  />
                : <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: '#5b4080', opacity: 0.7 }}>procurar notes</span>
              }
              {buscaExpanded && (
                <button onClick={toggleBusca} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b4080', opacity: 0.5, fontSize: 14, padding: '0 0 0 4px' }}>x</button>
              )}
            </div>
          </div>
        </div>

        {/* FAB — Criar novo note */}
        <button
          onClick={() => undefined}
          style={{
            position: 'absolute', bottom: 28, left: 28,
            height: 44, borderRadius: 999,
            background: 'linear-gradient(135deg, #9b7bc4 0%, #c79bd1 100%)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px',
            boxShadow: '0 4px 16px rgba(120,80,160,0.40)',
            zIndex: 60, transition: 'transform 0.2s, box-shadow 0.2s',
            fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: 'white',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <LapisSVG />
          Criar novo note
        </button>

        {/* Painel de zoom */}
        <div style={{ position: 'absolute', bottom: 28, right: 28, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {zoomExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'zoomExpand 0.18s ease-out' }}>
              <BotaoZoom label="+" title="Aproximar" onClick={zoomIn} fontSize={20} />
              <BotaoZoom label="100%" title="Restaurar zoom" onClick={zoomReset} width={56} height={32} fontSize={11} />
              <BotaoZoom label="-" title="Afastar" onClick={zoomOut} fontSize={20} />
            </div>
          )}
          <BotaoZoom
            label={`${Math.round(zoom * 100)}%`}
            title="Controles de zoom"
            onClick={() => setZoomExpanded(v => !v)}
            fontSize={11}
          />
        </div>
      </div>
    </>
  )
}
