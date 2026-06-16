import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

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

// ─── NotesPage ──────────────────────────────────────────────────────────────

export function NotesPage() {
  const [camX, setCamX] = useState(CANVAS_GAP)
  const [camY, setCamY] = useState(CANVAS_GAP)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)

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

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${camX}px, ${camY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      />
    </div>
  )
}

