import {
  useState, useEffect, useRef, useCallback, useMemo,
  type RefObject, type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { spacing, typography } from '../design/tokens'
import { api } from '../lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface DropdownPos {
  top: number
  left: number
  openUp: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const PALETA_BASE = [
  { hex: '#F59E0B', nome: 'Ambar' },
  { hex: '#EF4444', nome: 'Vermelho' },
  { hex: '#EC4899', nome: 'Rosa' },
  { hex: '#8B5CF6', nome: 'Roxo' },
  { hex: '#3B82F6', nome: 'Azul' },
  { hex: '#06B6D4', nome: 'Ciano' },
  { hex: '#10B981', nome: 'Verde' },
  { hex: '#84CC16', nome: 'Lima' },
  { hex: '#F97316', nome: 'Laranja' },
  { hex: '#14B8A6', nome: 'Turquesa' },
  { hex: '#6B7280', nome: 'Cinza' },
]

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function snapToGrid(x: number, y: number) {
  return {
    x: Math.round(x / GRID_COL) * GRID_COL,
    y: Math.round(y / GRID_ROW) * GRID_ROW,
  }
}

function celulaOcupada(
  notes: Note[],
  blocos: Bloco[],
  sx: number,
  sy: number,
  ignorarNoteId: number | null,
  ignorarBlocoId: number | null,
) {
  const noteOcupa = notes.some(
    n =>
      n.id !== ignorarNoteId &&
      Math.round(n.canvasX / GRID_COL) === Math.round(sx / GRID_COL) &&
      Math.round(n.canvasY / GRID_ROW) === Math.round(sy / GRID_ROW),
  )
  const blocoOcupa = blocos.some(
    b =>
      b.id !== ignorarBlocoId &&
      Math.round(b.canvasX / GRID_COL) === Math.round(sx / GRID_COL) &&
      Math.round(b.canvasY / GRID_ROW) === Math.round(sy / GRID_ROW),
  )
  return noteOcupa || blocoOcupa
}

function proximaPosicaoLivre(notes: Note[], blocos: Bloco[]) {
  const COLS_POR_LINHA = 6
  const ocupadas = new Set<string>()
  for (const n of notes) {
    ocupadas.add(`${Math.round(n.canvasX / GRID_COL)},${Math.round(n.canvasY / GRID_ROW)}`)
  }
  for (const b of blocos) {
    ocupadas.add(`${Math.round(b.canvasX / GRID_COL)},${Math.round(b.canvasY / GRID_ROW)}`)
  }
  for (let lin = 0; lin < 9999; lin++) {
    for (let col = 0; col < COLS_POR_LINHA; col++) {
      if (!ocupadas.has(`${col},${lin}`)) {
        return { x: col * GRID_COL, y: lin * GRID_ROW }
      }
    }
  }
  return { x: 0, y: 0 }
}

function maxOrdemAtual(notes: Note[], blocos: Bloco[]) {
  const ordens = [...notes.map(n => n.canvasOrdem), ...blocos.map(b => b.canvasOrdem)]
  return ordens.length > 0 ? Math.max(...ordens) : 0
}

function ajustarLuminosidade(hex: string, lum: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = max > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  const L = Math.max(0.15, Math.min(0.85, lum))
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let nr: number, ng: number, nb: number
  if (s === 0) {
    nr = ng = nb = L
  } else {
    const q2 = L < 0.5 ? L * (1 + s) : L + s - L * s
    const p2 = 2 * L - q2
    nr = hue2rgb(p2, q2, h + 1 / 3)
    ng = hue2rgb(p2, q2, h)
    nb = hue2rgb(p2, q2, h - 1 / 3)
  }
  const th = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${th(nr)}${th(ng)}${th(nb)}`
}

function getLuminosidadeBase(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}

function isEscuro(hex: string) {
  if (!hex || hex === '#ffffff') return false
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 0.6
}

// ─── BotaoZoom ────────────────────────────────────────────────────────────────

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

// ─── TexturaCanvas ────────────────────────────────────────────────────────────

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
        const idx   = (y * CARD_W + x) * 4
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

// ─── IconeMuralPrivado ────────────────────────────────────────────────────────

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

// ─── CardBoasVindas ───────────────────────────────────────────────────────────

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
            fontSize: 13, fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            margin: '0 0 7px', lineHeight: 1.3,
          }}>
            Bem-vindo ao seu mural infinito
          </p>
          <p style={{
            fontFamily: typography.fontFamily.primary,
            fontSize: 10.5, fontWeight: 400,
            color: 'rgba(255,255,255,0.70)',
            margin: 0, lineHeight: 1.6,
          }}>
            Crie e arraste quantos notes forem necessarios. Comece quando quiser clicando em{' '}
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>Criar novo note</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── LapisSVG ─────────────────────────────────────────────────────────────────

function LapisSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// ─── CardDropdown ─────────────────────────────────────────────────────────────

interface CardDropdownProps {
  pos: DropdownPos | null
  onExcluir: () => void
  onFechar: () => void
}

function CardDropdown({ pos, onExcluir, onFechar }: CardDropdownProps) {
  if (!pos) return null

  const itemStyle = (danger = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    textAlign: 'left',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    color: danger ? '#ef4444' : '#4a3470',
    fontSize: 12,
    fontFamily: typography.fontFamily.primary,
    cursor: 'pointer',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    transition: 'background 0.12s',
  })

  const top = pos.openUp ? undefined : pos.top
  const bot = pos.openUp ? window.innerHeight - pos.top : undefined

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onMouseDown={e => { e.stopPropagation(); onFechar() }}
      />
      <div
        style={{
          position: 'fixed',
          top, bottom: bot,
          left: pos.left,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          borderRadius: 12,
          padding: '5px 4px',
          minWidth: 160,
          boxShadow: '0 8px 32px rgba(120,80,160,0.25)',
          border: '1px solid rgba(255,255,255,0.70)',
          zIndex: 9999,
          animation: 'dropdownOpen 0.14s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          style={itemStyle(true)}
          onClick={e => { e.stopPropagation(); onExcluir(); onFechar() }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: 12 }}>🗑️</span> Excluir
        </button>
      </div>
    </>,
    document.body,
  )
}

// ─── ModalConfirm ─────────────────────────────────────────────────────────────

interface ModalConfirmProps {
  titulo: string
  descricao: string
  labelConfirmar: string
  onConfirmar: () => void
  onCancelar: () => void
}

function ModalConfirm({ titulo, descricao, labelConfirmar, onConfirmar, onCancelar }: ModalConfirmProps) {
  return (
    <>
      <div
        onClick={onCancelar}
        style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(120,80,160,0.12)', backdropFilter: 'blur(10px)' }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 16, padding: '28px 28px 24px', width: 360,
            border: '1px solid rgba(255,255,255,0.80)',
            boxShadow: '0 16px 60px rgba(120,80,160,0.25)',
            animation: 'modalEntrar 0.2s ease-out forwards',
            pointerEvents: 'auto',
          }}
        >
          <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 16, fontWeight: 700, color: '#2d1b5e', margin: '0 0 10px' }}>{titulo}</h3>
          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: '#6b5a8a', margin: '0 0 22px', lineHeight: 1.6 }}>{descricao}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancelar}
              style={{ background: 'transparent', border: '1px solid rgba(120,80,160,0.25)', borderRadius: 8, color: '#6b5a8a', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: typography.fontFamily.primary }}
            >Cancelar</button>
            <button
              onClick={onConfirmar}
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, color: '#dc2626', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: typography.fontFamily.primary }}
            >{labelConfirmar}</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── OpcaoDropdown ────────────────────────────────────────────────────────────

interface OpcaoDropdownProps {
  emoji: string
  label: string
  desc: string
  onClick: () => void
  danger?: boolean
}

function OpcaoDropdown({ emoji, label, desc, onClick, danger }: OpcaoDropdownProps) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left',
        background: hover ? 'rgba(120,80,160,0.07)' : 'transparent',
        border: 'none', borderRadius: 10, padding: '8px 10px',
        cursor: 'pointer', transition: 'background 0.15s', gap: 1,
      }}
    >
      <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: danger ? '#dc2626' : '#2d1b5e' }}>{emoji} {label}</span>
      <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: danger ? 'rgba(220,38,38,0.6)' : '#6b5a8a', paddingLeft: 22 }}>{desc}</span>
    </button>
  )
}

// ─── PostIt ───────────────────────────────────────────────────────────────────

interface PostItProps {
  note: Note
  posX: number
  posY: number
  isDragging: boolean
  isSnapBack: boolean
  destacado: boolean
  isNew: boolean
  dropdownAberto: boolean
  zoom: number
  onAbrir: () => void
  onDragStart: (e: ReactMouseEvent) => void
  onDropdownToggle: (e: ReactMouseEvent) => void
  onExcluir: () => void
  onDropdownFechar: () => void
}

function PostIt({
  note, posX, posY, isDragging, isSnapBack, destacado, isNew,
  dropdownAberto, zoom,
  onAbrir, onDragStart, onDropdownToggle, onExcluir, onDropdownFechar,
}: PostItProps) {
  const temFoto    = Boolean(note.imagemCapa)
  const dropBtnRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)

  useEffect(() => {
    if (!dropdownAberto) { setDropdownPos(null); return }
    requestAnimationFrame(() => {
      const r = dropBtnRef.current?.getBoundingClientRect()
      if (!r) return
      const spaceBelow = window.innerHeight - r.bottom
      const openUp     = spaceBelow < 120
      setDropdownPos({ top: openUp ? r.top - 4 : r.bottom + 4, left: r.right - 160, openUp })
    })
  }, [dropdownAberto])

  const preview = (() => {
    const frases = note.conteudo.split(/(?<=[.!?])\s+/)
    let resultado = ''
    for (const frase of frases) {
      if ((resultado + frase).length > 180) break
      resultado += (resultado ? ' ' : '') + frase
      if (resultado.split(/[.!?]/).length - 1 >= 2) break
    }
    return resultado || note.conteudo.slice(0, 180)
  })()

  const bgStyle = temFoto
    ? { backgroundImage: `url(${note.imagemCapa})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: note.cor }

  const animation = isNew
    ? 'cardEntrar 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards'
    : destacado
      ? 'destacarCard 2s ease-in-out'
      : undefined

  return (
    <div
      data-card="true"
      style={{
        position: 'absolute', left: posX, top: posY,
        width: CARD_W, height: CARD_H,
        ...bgStyle,
        borderRadius: 12,
        boxShadow: isDragging
          ? '0 20px 48px rgba(120,80,160,0.35)'
          : destacado
            ? '0 0 0 3px #a78bfa, 0 8px 32px rgba(167,139,250,0.45)'
            : '0 4px 16px rgba(120,80,160,0.18)',
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.50)',
        transition: isDragging
          ? 'none'
          : isSnapBack
            ? 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s'
            : 'box-shadow 0.2s',
        animation,
        zIndex: isDragging || isSnapBack ? 100 : 1,
        userSelect: 'none',
      }}
      onMouseDown={onDragStart}
      onDoubleClick={e => { e.stopPropagation(); onAbrir() }}
    >
      {temFoto && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.12) 55%,transparent 100%)', borderRadius: 12 }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, padding: '16px 16px 0', flex: 1, overflow: 'hidden' }}>
        <h3 style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: 13, fontWeight: 700,
          color: temFoto ? 'white' : isEscuro(note.cor) ? '#fff' : 'rgba(0,0,0,0.82)',
          margin: '0 0 6px', lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {note.tituloCapa || note.titulo}
        </h3>
        <p style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: 11, lineHeight: 1.6,
          color: temFoto ? 'rgba(255,255,255,0.75)' : isEscuro(note.cor) ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.55)',
          margin: 0,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
        }}>
          {preview}
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '8px 16px 12px' }}>
        <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: temFoto ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)', letterSpacing: '0.02em' }}>
          🕐 {note.data}
        </span>
      </div>

      <button
        ref={dropBtnRef}
        onClick={e => { e.stopPropagation(); onDropdownToggle(e) }}
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 10, right: 10,
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(0,0,0,0.12)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: temFoto ? '#fff' : isEscuro(note.cor) ? '#fff' : '#4a3470',
          fontSize: 15, zIndex: 10,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.22)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)' }}
      >⋯</button>

      {dropdownAberto && dropdownPos && (
        <CardDropdown
          pos={dropdownPos}
          onExcluir={onExcluir}
          onFechar={onDropdownFechar}
        />
      )}
    </div>
  )
}

// ─── ModalLeitura ─────────────────────────────────────────────────────────────

interface ModalLeituraProps {
  note: Note
  onFechar: () => void
  onExcluido: (id: number) => void
}

function ModalLeitura({ note, onFechar, onExcluido }: ModalLeituraProps) {
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const temFoto     = Boolean(note.imagemCapa)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function excluir() {
    await api.delete(`/notes/${note.id}`)
    onExcluido(note.id)
  }

  const bg  = temFoto ? '#1a0f2e' : (note.cor || '#ffffff')
  const tx  = temFoto || isEscuro(note.cor) ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)'
  const sub = temFoto || isEscuro(note.cor) ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.42)'

  return (
    <>
      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(120,80,160,0.12)', backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: bg, borderRadius: 20,
            width: '100%', maxWidth: 580, maxHeight: '85vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(120,80,160,0.35)',
            animation: 'modalEntrar 0.22s ease-out forwards',
            pointerEvents: 'auto',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          {temFoto && (
            <div style={{ position: 'relative', height: 200, flexShrink: 0, background: `url(${note.imagemCapa}) center/cover` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(26,15,46,0.95) 100%)' }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0', flexShrink: 0 }}>
            <div style={{ flex: 1 }} />
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0, marginLeft: 12 }}>
              <button
                onClick={() => setDropdownAberto(v => !v)}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10,
                  padding: '6px 12px', cursor: 'pointer',
                  fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: tx,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.20)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
              >
                <span style={{ letterSpacing: 2 }}>•••</span>
              </button>
              {dropdownAberto && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.80)', borderRadius: 14,
                  padding: 8, minWidth: 220,
                  boxShadow: '0 12px 40px rgba(120,80,160,0.25)', zIndex: 10,
                  animation: 'dropdownOpen 0.18s ease-out forwards',
                }}>
                  <OpcaoDropdown
                    emoji="🗑️"
                    label="Excluir note"
                    desc="Remove permanentemente"
                    onClick={() => { setDropdownAberto(false); setConfirmExcluir(true) }}
                    danger
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
            <h2 style={{ fontFamily: typography.fontFamily.primary, fontSize: 22, fontWeight: 800, color: tx, margin: 0, lineHeight: 1.3 }}>
              {note.tituloCapa || note.titulo}
            </h2>
            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: sub, margin: '6px 0 0' }}>🕐 {note.data}</p>
          </div>

          <div style={{ padding: '16px 24px 24px', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 14, lineHeight: 1.8, color: tx, margin: 0, whiteSpace: 'pre-wrap' }}>
              {note.conteudo}
            </p>
          </div>

          <div style={{ padding: '16px 24px 20px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            <button
              onClick={onFechar}
              style={{ width: '100%', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.10)', border: 'none', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: tx, opacity: 0.7 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
            >Fechar</button>
          </div>
        </div>
      </div>

      {confirmExcluir && (
        <ModalConfirm
          titulo="Excluir note?"
          descricao="Este note sera removido permanentemente. Esta acao nao pode ser desfeita."
          labelConfirmar="Excluir"
          onConfirmar={excluir}
          onCancelar={() => setConfirmExcluir(false)}
        />
      )}
    </>
  )
}

// ─── ComposerModal ────────────────────────────────────────────────────────────

interface ComposerModalProps {
  notes: Note[]
  blocos: Bloco[]
  onFechar: () => void
  onCriado: (note: Note) => void
}

function ComposerModal({ notes, blocos, onFechar, onCriado }: ComposerModalProps) {
  const [titulo, setTitulo]           = useState('')
  const [conteudo, setConteudo]       = useState('')
  const [corBase, setCorBase]         = useState<string | null>(null)
  const [luminosidade, setLuminosidade] = useState(0.45)
  const [erro, setErro]               = useState('')
  const [salvando, setSalvando]       = useState(false)
  const sliderRef  = useRef<HTMLDivElement>(null)
  const arrastando = useRef(false)

  const corFinal    = corBase ? ajustarLuminosidade(corBase, luminosidade) : '#ffffff'
  const fundoEscuro = luminosidade < 0.55 && corBase !== null
  const textoEl     = fundoEscuro ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.80)'
  const inputBg     = fundoEscuro ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'

  const calcLum = useCallback((cy: number) => {
    const r = sliderRef.current?.getBoundingClientRect()
    if (!r) return
    setLuminosidade(Math.max(0.15, Math.min(0.85, 1 - (cy - r.top) / r.height)))
  }, [])

  useEffect(() => {
    const onM = (e: MouseEvent) => { if (arrastando.current) calcLum(e.clientY) }
    const onU = () => { arrastando.current = false }
    window.addEventListener('mousemove', onM)
    window.addEventListener('mouseup', onU)
    return () => { window.removeEventListener('mousemove', onM); window.removeEventListener('mouseup', onU) }
  }, [calcLum])

  function onEscolherCor(hex: string) {
    if (corBase === hex) { setCorBase(null); setLuminosidade(0.45) }
    else { setCorBase(hex); setLuminosidade(getLuminosidadeBase(hex)) }
  }

  async function salvar() {
    if (!titulo.trim()) { setErro('Titulo obrigatorio.'); return }
    if (!conteudo.trim()) { setErro('Conteudo obrigatorio.'); return }
    setSalvando(true); setErro('')

    const novaOrdem = maxOrdemAtual(notes, blocos) + 1
    const pos       = proximaPosicaoLivre(notes, blocos)

    const data = await api.post<{ note: Note }>('/notes', {
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      cor: corFinal,
      canvasX: pos.x,
      canvasY: pos.y,
      canvasOrdem: novaOrdem,
    })

    onCriado(data.note)
  }

  const indPct = (1 - (luminosidade - 0.15) / 0.70) * 100

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(120,80,160,0.12)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onFechar}
    >
      <div
        style={{ background: corFinal, borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(120,80,160,0.35)', overflow: 'hidden', transition: 'background 0.25s', border: '1px solid rgba(255,255,255,0.50)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: 24 }}>
          <style>{`.note-input::placeholder{color:${fundoEscuro ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.30)'}}`}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 15, fontWeight: 700, color: textoEl, margin: 0 }}>Novo Note</h3>
            <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: textoEl, opacity: 0.5 }}>✕</button>
          </div>
          <input
            className="note-input"
            type="text"
            placeholder="Titulo..."
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            style={{ width: '100%', border: 'none', background: inputBg, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: typography.fontFamily.primary, fontWeight: 600, color: textoEl, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
          />
          <textarea
            className="note-input"
            placeholder="O que esta na sua cabeca?"
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            rows={4}
            style={{ width: '100%', border: 'none', background: inputBg, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: typography.fontFamily.primary, color: textoEl, resize: 'none', marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
          />

          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, fontWeight: 600, color: textoEl, opacity: 0.55, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cor do card</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, flex: 1 }}>
              <button
                onClick={() => { setCorBase(null); setLuminosidade(0.45) }}
                title="Padrao"
                style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', border: corBase === null ? '3px solid #7c5ab8' : '2px solid #d1d5db', cursor: 'pointer', transform: corBase === null ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s' }}
              />
              {PALETA_BASE.map(({ hex, nome }) => (
                <button
                  key={hex}
                  onClick={() => onEscolherCor(hex)}
                  title={nome}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: hex, border: corBase === hex ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', transform: corBase === hex ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s', boxShadow: corBase === hex ? '0 0 0 2px rgba(0,0,0,0.18)' : 'none' }}
                />
              ))}
            </div>
            {corBase && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: textoEl, opacity: 0.5 }}>clar</span>
                <div
                  ref={sliderRef}
                  onMouseDown={e => { arrastando.current = true; calcLum(e.clientY) }}
                  onClick={e => calcLum(e.clientY)}
                  style={{ width: 20, height: 100, borderRadius: 10, cursor: 'ns-resize', position: 'relative', background: `linear-gradient(to bottom,${ajustarLuminosidade(corBase, 0.85)},${ajustarLuminosidade(corBase, 0.45)},${ajustarLuminosidade(corBase, 0.15)})`, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
                >
                  <div style={{ position: 'absolute', left: '50%', top: `${indPct}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: '50%', background: corFinal, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
                </div>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: textoEl, opacity: 0.5 }}>esc</span>
              </div>
            )}
          </div>

          {erro && <p style={{ color: '#dc2626', fontSize: 12, fontFamily: typography.fontFamily.primary, marginBottom: 12 }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onFechar}
              style={{ flex: 1, padding: 10, borderRadius: 8, background: inputBg, border: 'none', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: textoEl, opacity: 0.8 }}
            >Cancelar</button>
            <button
              onClick={salvar}
              disabled={salvando}
              style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(120,80,160,0.15)', border: '1.5px solid rgba(120,80,160,0.40)', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 700, color: fundoEscuro ? 'white' : '#5b4080', opacity: salvando ? 0.6 : 1 }}
            >
              {salvando ? 'Salvando...' : 'Salvar Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── NotesPage ────────────────────────────────────────────────────────────────

export function NotesPage() {
  const [notes, setNotes]                   = useState<Note[]>([])
  const [blocos]                            = useState<Bloco[]>([])
  const [loading, setLoading]               = useState(true)
  const [erro, setErro]                     = useState('')
  const [composerAberto, setComposerAberto] = useState(false)
  const [noteLendo, setNoteLendo]           = useState<Note | null>(null)
  const [dropdownCardId, setDropdownCardId] = useState<number | null>(null)
  const [newNoteId, setNewNoteId]           = useState<number | null>(null)
  const [snapBackId, setSnapBackId]         = useState<number | null>(null)
  const [destacado, setDestacado]           = useState<number | null>(null)
  const [confirmExcluirId, setConfirmExcluirId] = useState<number | null>(null)

  const [camX, setCamX] = useState(CANVAS_GAP)
  const [camY, setCamY] = useState(CANVAS_GAP)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const [zoomExpanded, setZoomExpanded] = useState(false)

  const [busca, setBusca]                   = useState('')
  const [buscaExpanded, setBuscaExpanded]   = useState(false)
  const buscaInputRef = useRef<HTMLInputElement>(null)

  const containerRef  = useRef<HTMLDivElement>(null)
  const panRef        = useRef(false)
  const panStart      = useRef({ x: 0, y: 0, camX: 0, camY: 0 })

  const dragNoteRef   = useRef<{ id: number; startMouseX: number; startMouseY: number; startCardX: number; startCardY: number } | null>(null)
  const dragOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [draggingNoteId, setDraggingNoteId] = useState<number | null>(null)
  const [dragPos, setDragPos]               = useState<{ x: number; y: number } | null>(null)

  useEffect(() => { carregarNotes() }, [])

  useEffect(() => {
    if (buscaExpanded) buscaInputRef.current?.focus()
  }, [buscaExpanded])

  useEffect(() => {
    if (dropdownCardId === null) return
    function handler(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
        setDropdownCardId(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [dropdownCardId])

  async function carregarNotes() {
    try {
      const data = await api.get<{ notes: Note[] }>('/notes')
      setNotes(data.notes)
    } catch {
      setErro('Erro ao carregar notes.')
    } finally {
      setLoading(false)
    }
  }

  const salvarPosTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  function salvarPosicaoNote(id: number, x: number, y: number, ordem: number) {
    if (salvarPosTimeout.current) clearTimeout(salvarPosTimeout.current)
    salvarPosTimeout.current = setTimeout(() => {
      api.put(`/notes/${id}/posicao`, { canvasX: x, canvasY: y, canvasOrdem: ordem })
    }, 600)
  }

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return
    if (e.button !== 0) return
    panRef.current = true
    panStart.current = { x: e.clientX, y: e.clientY, camX, camY }
    e.preventDefault()
  }, [camX, camY])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (panRef.current) {
        setCamX(panStart.current.camX + (e.clientX - panStart.current.x))
        setCamY(panStart.current.camY + (e.clientY - panStart.current.y))
      }
      if (dragNoteRef.current) {
        const dx = (e.clientX - dragNoteRef.current.startMouseX) / zoom
        const dy = (e.clientY - dragNoteRef.current.startMouseY) / zoom
        setDragPos({
          x: dragNoteRef.current.startCardX + dx,
          y: dragNoteRef.current.startCardY + dy,
        })
      }
    }

    function onUp() {
      panRef.current = false

      if (dragNoteRef.current && dragPos) {
        const { id } = dragNoteRef.current
        const sn     = snapToGrid(dragPos.x, dragPos.y)

        if (celulaOcupada(notes, blocos, sn.x, sn.y, id, null)) {
          const origin = dragOriginRef.current
          setSnapBackId(id)
          setNotes(prev => prev.map(n => n.id === id ? { ...n, canvasX: origin.x, canvasY: origin.y } : n))
          setTimeout(() => setSnapBackId(null), 380)
        } else {
          setNotes(prev => prev.map(n => {
            if (n.id !== id) return n
            salvarPosicaoNote(id, sn.x, sn.y, n.canvasOrdem)
            return { ...n, canvasX: sn.x, canvasY: sn.y }
          }))
        }

        dragNoteRef.current = null
        setDraggingNoteId(null)
        setDragPos(null)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [zoom, dragPos, notes, blocos])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    setZoom(prev => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  function zoomIn()    { setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))) }
  function zoomOut()   { setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))) }
  function zoomReset() { setZoom(ZOOM_DEFAULT); setCamX(CANVAS_GAP); setCamY(CANVAS_GAP) }

  function toggleBusca() {
    if (buscaExpanded) { setBuscaExpanded(false); setBusca('') }
    else { setBuscaExpanded(true) }
  }

  function iniciarDragNote(e: ReactMouseEvent, note: Note) {
    e.stopPropagation()
    dragOriginRef.current = { x: note.canvasX, y: note.canvasY }
    dragNoteRef.current   = { id: note.id, startMouseX: e.clientX, startMouseY: e.clientY, startCardX: note.canvasX, startCardY: note.canvasY }
    setDraggingNoteId(note.id)
    setDragPos({ x: note.canvasX, y: note.canvasY })
  }

  function navegarAteNote(note: Note) {
    const c = containerRef.current
    if (!c) return
    const { width, height } = c.getBoundingClientRect()
    setCamX(width  / 2 - (note.canvasX + CARD_W / 2) * zoom)
    setCamY(height / 2 - (note.canvasY + CARD_H / 2) * zoom)
    setDestacado(note.id)
    setBuscaExpanded(false)
    setBusca('')
    setTimeout(() => setDestacado(null), 2000)
  }

  async function excluirNote(id: number) {
    await api.delete(`/notes/${id}`)
    setNotes(prev => prev.filter(n => n.id !== id))
    setConfirmExcluirId(null)
    setDropdownCardId(null)
  }

  function onNoteCriado(note: Note) {
    setNotes(prev => [...prev, note])
    setComposerAberto(false)
    setNewNoteId(note.id)
    setTimeout(() => {
      navegarAteNote(note)
      setTimeout(() => setNewNoteId(null), 600)
    }, 80)
  }

  function onNoteExcluido(id: number) {
    setNotes(prev => prev.filter(n => n.id !== id))
    setNoteLendo(null)
  }

  const notesVisiveis = useMemo(() => {
    const c = containerRef.current
    if (!c) return notes
    const { width, height } = c.getBoundingClientRect()
    if (width === 0) return notes
    const x0 = (-camX - BUFFER_PX) / zoom
    const y0 = (-camY - BUFFER_PX) / zoom
    const x1 = (-camX + width  + BUFFER_PX) / zoom
    const y1 = (-camY + height + BUFFER_PX) / zoom
    return notes.filter(n => {
      const cx = draggingNoteId === n.id && dragPos ? dragPos.x : n.canvasX
      const cy = draggingNoteId === n.id && dragPos ? dragPos.y : n.canvasY
      return cx + CARD_W > x0 && cx < x1 && cy + CARD_H > y0 && cy < y1
    })
  }, [notes, camX, camY, zoom, draggingNoteId, dragPos])

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return []
    const q = busca.toLowerCase()
    return notes.filter(n =>
      n.titulo.toLowerCase().includes(q) ||
      n.tituloCapa.toLowerCase().includes(q) ||
      n.conteudo.toLowerCase().includes(q),
    )
  }, [busca, notes])

  const noteParaConfirm = confirmExcluirId !== null ? notes.find(n => n.id === confirmExcluirId) : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, background: 'linear-gradient(155deg, #d4b8d4 0%, #e2cde2 45%, #eddaed 100%)' }}>
      <span style={{ fontSize: '2.5rem' }}>📓</span>
      <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: '#5b4080' }}>Carregando notes...</p>
    </div>
  )

  if (erro) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(155deg, #d4b8d4 0%, #e2cde2 45%, #eddaed 100%)' }}>
      <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: '#dc2626' }}>{erro}</p>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes destacarCard {
          0%,100% { box-shadow: 0 4px 16px rgba(120,80,160,0.18); }
          30%,60%  { box-shadow: 0 0 0 3px #a78bfa, 0 8px 32px rgba(167,139,250,0.45); }
        }
        @keyframes modalEntrar {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes dropdownOpen {
          from { opacity: 0; transform: scale(0.92) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes zoomExpand {
          from { opacity: 0; transform: scale(0.85) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cardEntrar {
          from { opacity: 0; transform: scale(0.55) translateY(-40px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{
          position: 'fixed', inset: 0,
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
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(circle, ${GRID_DOT_COLOR} ${GRID_DOT_RADIUS}px, transparent ${GRID_DOT_RADIUS}px)`,
            backgroundSize: `${GRID_COL * zoom}px ${GRID_ROW * zoom}px`,
            backgroundPosition: `${camX}px ${camY}px`,
            pointerEvents: 'none',
          }}
        />

        {/* Camada do canvas */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate(${camX}px, ${camY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
            overflow: 'visible',
          }}
        >
          {notes.length === 0 && (
            <CardBoasVindas camX={camX} camY={camY} zoom={zoom} containerRef={containerRef} />
          )}

          {notesVisiveis.map(note => {
            const isDragging = draggingNoteId === note.id
            const posX = isDragging && dragPos ? dragPos.x : note.canvasX
            const posY = isDragging && dragPos ? dragPos.y : note.canvasY
            return (
              <PostIt
                key={note.id}
                note={note}
                posX={posX} posY={posY}
                isDragging={isDragging}
                isSnapBack={snapBackId === note.id}
                destacado={destacado === note.id}
                isNew={newNoteId === note.id}
                dropdownAberto={dropdownCardId === note.id}
                zoom={zoom}
                onAbrir={() => setNoteLendo(note)}
                onDragStart={e => iniciarDragNote(e, note)}
                onDropdownToggle={e => {
                  e.stopPropagation()
                  setDropdownCardId(prev => prev === note.id ? null : note.id)
                }}
                onExcluir={() => setConfirmExcluirId(note.id)}
                onDropdownFechar={() => setDropdownCardId(null)}
              />
            )
          })}
        </div>

        {/* Pill de busca */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
          <div style={{
            background: buscaExpanded ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.50)',
            backdropFilter: 'blur(16px)',
            borderRadius: buscaExpanded ? 14 : 999,
            border: '1px solid rgba(255,255,255,0.65)',
            boxShadow: buscaExpanded ? '0 8px 28px rgba(120,80,160,0.20)' : 'none',
            transition: 'border-radius 0.2s, background 0.2s, box-shadow 0.2s',
            minWidth: buscaExpanded ? 340 : undefined,
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
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: typography.fontFamily.primary, fontSize: 13, color: '#4a3470', padding: '11px 0', minWidth: 260 }}
                  />
                : <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: '#5b4080', opacity: 0.7 }}>procurar notes</span>
              }
              {buscaExpanded && (
                <button onClick={toggleBusca} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b4080', opacity: 0.5, fontSize: 14, padding: '0 0 0 4px' }}>✕</button>
              )}
            </div>

            {buscaExpanded && busca && (
              <div style={{ borderTop: '1px solid rgba(120,80,160,0.10)' }}>
                {resultadosBusca.length === 0
                  ? <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: '#6b5a8a', padding: '12px 14px', margin: 0 }}>Nenhum resultado para "{busca}"</p>
                  : <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 10, color: '#8b7aaa', padding: '8px 14px 4px', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {resultadosBusca.length} resultado{resultadosBusca.length > 1 ? 's' : ''}
                      </p>
                      {resultadosBusca.map(n => {
                        const qi     = n.conteudo.toLowerCase().indexOf(busca.toLowerCase())
                        const trecho = qi >= 0
                          ? '...' + n.conteudo.slice(Math.max(0, qi - 20), qi + 60) + '...'
                          : n.conteudo.slice(0, 80) + '...'
                        return (
                          <button
                            key={n.id}
                            onMouseDown={() => navegarAteNote(n)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', borderTop: '1px solid rgba(120,80,160,0.06)', transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(120,80,160,0.06)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                          >
                            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: '#2d1b5e', margin: '0 0 2px' }}>{n.tituloCapa || n.titulo}</p>
                            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: '#8b7aaa', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trecho}</p>
                          </button>
                        )
                      })}
                    </div>
                }
              </div>
            )}
          </div>
        </div>

        {/* FAB — Criar novo note */}
        <button
          onClick={() => setComposerAberto(true)}
          style={{
            position: 'absolute', bottom: 28, right: 28,
            height: 44, borderRadius: 999,
            background: 'linear-gradient(135deg, #9b7bc4 0%, #c79bd1 100%)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px',
            boxShadow: '0 4px 16px rgba(120,80,160,0.40)',
            zIndex: 60, transition: 'transform 0.2s, box-shadow 0.2s',
            fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: 'white',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(120,80,160,0.55)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(120,80,160,0.40)' }}
        >
          <LapisSVG />
          Criar novo note
        </button>

        {/* Painel de zoom */}
        <div style={{ position: 'absolute', bottom: 28, left: 28, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {zoomExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'zoomExpand 0.18s ease-out' }}>
              <BotaoZoom label="+" title="Aproximar" onClick={zoomIn} fontSize={20} />
              <BotaoZoom label={`${Math.round(zoom * 100)}%`} title="Restaurar zoom" onClick={zoomReset} width={56} height={32} fontSize={11} />
              <BotaoZoom label="-" title="Afastar" onClick={zoomOut} fontSize={20} />
            </div>
          )}
          <button
            onClick={() => setZoomExpanded(v => !v)}
            title="Controles de zoom"
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: zoomExpanded ? 'rgba(155,123,196,0.85)' : 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255,255,255,0.70)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 2px 10px rgba(120,80,160,0.22)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, transition: 'background 0.2s',
            }}
          >🎮</button>
        </div>
      </div>

      {composerAberto && (
        <ComposerModal
          notes={notes}
          blocos={blocos}
          onFechar={() => setComposerAberto(false)}
          onCriado={onNoteCriado}
        />
      )}

      {noteLendo && (
        <ModalLeitura
          note={noteLendo}
          onFechar={() => setNoteLendo(null)}
          onExcluido={onNoteExcluido}
        />
      )}

      {confirmExcluirId !== null && noteParaConfirm && (
        <ModalConfirm
          titulo="Excluir note?"
          descricao={`O note "${noteParaConfirm.titulo}" sera removido permanentemente. Esta acao nao pode ser desfeita.`}
          labelConfirmar="Excluir"
          onConfirmar={() => excluirNote(confirmExcluirId)}
          onCancelar={() => setConfirmExcluirId(null)}
        />
      )}
    </>
  )
}
