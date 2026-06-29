import {
  useState, useEffect, useRef, useCallback, useMemo,
  type RefObject, type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { spacing, typography } from '../design/tokens'
import { api } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import type { ThemeTokens } from '../design/themes'

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

const CARD_W            = 260
const CARD_H            = 220
const GRID_COL          = 280
const GRID_ROW          = 260
const ZOOM_MIN          = 0.35
const ZOOM_MAX          = 2.0
const ZOOM_STEP         = 0.12
const ZOOM_DEFAULT      = 1.0
const CANVAS_GAP        = 48
const BUFFER_PX         = 300
const TOWER_MAX_VISIBLE = 7
const TOWER_OFFSET_X    = 2
const TOWER_OFFSET_Y    = 2.5
const CLIP_OVERLAP      = 17
const HEADER_H          = 36

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


function useMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}


function snapToGrid(x: number, y: number) {
  return {
    x: Math.round(x / GRID_COL) * GRID_COL,
    y: Math.round(y / GRID_ROW) * GRID_ROW,
  }
}

function celulaOcupada(notes: Note[], blocos: Bloco[], sx: number, sy: number, ignorarNoteId: number | null, ignorarBlocoId: number | null) {
  const noteOcupa = notes.some(n => n.id !== ignorarNoteId && Math.round(n.canvasX / GRID_COL) === Math.round(sx / GRID_COL) && Math.round(n.canvasY / GRID_ROW) === Math.round(sy / GRID_ROW))
  const blocoOcupa = blocos.some(b => b.id !== ignorarBlocoId && Math.round(b.canvasX / GRID_COL) === Math.round(sx / GRID_COL) && Math.round(b.canvasY / GRID_ROW) === Math.round(sy / GRID_ROW))
  return noteOcupa || blocoOcupa
}

function proximaPosicaoLivre(notes: Note[], blocos: Bloco[], mobile = false) {
  const COLS      = mobile ? 2   : 6
  const ROWS_VERT = mobile ? 5   : 9999
  const ocupadas  = new Set<string>()
  for (const n of notes)  ocupadas.add(`${Math.round(n.canvasX / GRID_COL)},${Math.round(n.canvasY / GRID_ROW)}`)
  for (const b of blocos) ocupadas.add(`${Math.round(b.canvasX / GRID_COL)},${Math.round(b.canvasY / GRID_ROW)}`)

  if (mobile) {
    // Preenche verticalmente: 5 linhas por coluna antes de quebrar
    for (let col = 0; col < COLS; col++) {
      for (let lin = 0; lin < ROWS_VERT; lin++) {
        if (!ocupadas.has(`${col},${lin}`)) return { x: col * GRID_COL, y: lin * GRID_ROW }
      }
    }
  } else {
    for (let lin = 0; lin < 9999; lin++) {
      for (let col = 0; col < COLS; col++) {
        if (!ocupadas.has(`${col},${lin}`)) return { x: col * GRID_COL, y: lin * GRID_ROW }
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
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let nr: number, ng: number, nb: number
  if (s === 0) { nr = ng = nb = L } else {
    const q2 = L < 0.5 ? L * (1 + s) : L + s - L * s
    const p2 = 2 * L - q2
    nr = hue2rgb(p2, q2, h + 1 / 3); ng = hue2rgb(p2, q2, h); nb = hue2rgb(p2, q2, h - 1 / 3)
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
  label: string; title: string; onClick: () => void; tokens: ThemeTokens
  width?: number; height?: number; fontSize?: number
}

function BotaoZoom({ label, title, onClick, tokens, width = 42, height = 42, fontSize = 18 }: BotaoZoomProps) {
  const bgNormal = tokens.surface.glass
  const bgHover  = tokens.surface.glassStrong
  return (
    <button onClick={onClick} title={title} style={{ width, height, borderRadius: 999, background: bgNormal, border: `1px solid ${tokens.border.subtle}`, backdropFilter: 'blur(12px)', boxShadow: `0 2px 10px rgba(${tokens.shadowRgb},0.22)`, cursor: 'pointer', color: tokens.text.primary, fontFamily: typography.fontFamily.primary, fontSize, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = bgHover }}
      onMouseLeave={e => { e.currentTarget.style.background = bgNormal }}
    >{label}</button>
  )
}

// ─── PrendedorSVG ─────────────────────────────────────────────────────────────

function PrendedorSVG({ width = 32 }: { width?: number }) {
  const h = width * 1.1
  return (
    <svg width={width} height={h} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="55" width="84" height="44" rx="5" fill="#1a1a1a" />
      <rect x="8" y="55" width="84" height="10" rx="3" fill="#111111" />
      <rect x="12" y="91" width="28" height="8" rx="3" fill="#111111" />
      <rect x="60" y="91" width="28" height="8" rx="3" fill="#111111" />
      <path d="M35 55 C35 35 28 15 50 5 C72 15 65 35 65 55" stroke="#c0c0c0" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M35 55 C35 35 28 15 50 5 C72 15 65 35 65 55" stroke="#e8e8e8" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  )
}

// ─── TexturaCanvas ────────────────────────────────────────────────────────────

function TexturaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    canvas.width = CARD_W; canvas.height = CARD_H
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(CARD_W, CARD_H)
    const px = img.data
    for (let y = 0; y < CARD_H; y++) {
      for (let x = 0; x < CARD_W; x++) {
        const idx = (y * CARD_W + x) * 4
        const grain = Math.random()
        const stripe = (Math.sin(y * 0.4 + Math.random() * 0.6) + 1) / 2
        const diag = (Math.sin((x + y) * 0.08) + 1) / 2
        const val = Math.floor((grain * 0.55 + stripe * 0.30 + diag * 0.15) * 255)
        px[idx] = px[idx + 1] = px[idx + 2] = val; px[idx + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit', opacity: 0.18, mixBlendMode: 'soft-light', pointerEvents: 'none', zIndex: 0 }} />
}

// ─── IconeMuralPrivado ────────────────────────────────────────────────────────

function IconeMuralPrivado({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mural-grad" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6b4e9e" /><stop offset="50%" stopColor="#a978b0" /><stop offset="100%" stopColor="#c9967a" />
        </linearGradient>
        <linearGradient id="mural-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.18)" /><stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="48" height="48" rx="4" fill="url(#mural-grad)" />
      <path d="M38 2 L50 14 L38 14 Z" fill="url(#mural-fold)" />
      <rect x="18" y="27" width="16" height="13" rx="3" fill="rgba(255,255,255,0.92)" />
      <path d="M20 27 V22 C20 18.134 32 18.134 32 22 V27" stroke="rgba(255,255,255,0.92)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <circle cx="26" cy="33" r="2.2" fill="url(#mural-grad)" />
      <rect x="25" y="33" width="2" height="3.5" rx="1" fill="url(#mural-grad)" />
    </svg>
  )
}

// ─── CardBoasVindas ───────────────────────────────────────────────────────────

interface CardBoasVindasProps {
  camX: number; camY: number; zoom: number
  containerRef: RefObject<HTMLDivElement | null>; tokens: ThemeTokens
}

function CardBoasVindas({ camX, camY, zoom, containerRef, tokens }: CardBoasVindasProps) {
  const container = containerRef.current
  const viewW = container ? container.getBoundingClientRect().width : window.innerWidth
  const viewH = container ? container.getBoundingClientRect().height : window.innerHeight
  const centroX = (-camX + viewW / 2) / zoom - CARD_W / 2
  const centroY = (-camY + viewH / 2) / zoom - CARD_H / 2
  return (
    <div style={{ position: 'absolute', left: centroX, top: centroY, width: CARD_W, height: CARD_H, borderRadius: spacing.cardRadius, background: tokens.background.navGradient, border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 12px 36px rgba(120,80,160,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '20px 24px', pointerEvents: 'none', userSelect: 'none', overflow: 'hidden' }}>
      <TexturaCanvas />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <IconeMuralPrivado size={52} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: '0 0 7px', lineHeight: 1.3 }}>Bem-vindo ao seu mural infinito</p>
          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 10.5, fontWeight: 400, color: 'rgba(255,255,255,0.70)', margin: 0, lineHeight: 1.6 }}>
            Crie e arraste quantos notes forem necessarios. Comece clicando em{' '}
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
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// ─── OpcaoDropdown ────────────────────────────────────────────────────────────

interface OpcaoDropdownProps {
  emoji: string; label: string; desc: string; tokens: ThemeTokens; onClick: () => void; danger?: boolean
}

function OpcaoDropdown({ emoji, label, desc, tokens, onClick, danger }: OpcaoDropdownProps) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', background: hover ? `rgba(${tokens.shadowRgb},0.07)` : 'transparent', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', transition: 'background 0.15s', gap: 1 }}>
      <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: danger ? tokens.danger.text : tokens.text.primary }}>{emoji} {label}</span>
      <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: danger ? `rgba(${tokens.danger.rgb},0.6)` : tokens.text.secondary, paddingLeft: 22 }}>{desc}</span>
    </button>
  )
}

// ─── ModalConfirm ─────────────────────────────────────────────────────────────

interface ModalConfirmProps {
  titulo: string; descricao: string; labelConfirmar: string; tokens: ThemeTokens
  onConfirmar: () => void; onCancelar: () => void
}

function ModalConfirm({ titulo, descricao, labelConfirmar, tokens, onConfirmar, onCancelar }: ModalConfirmProps) {
  return (
    <>
      <div onClick={onCancelar} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: `rgba(${tokens.shadowRgb},0.12)`, backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: tokens.surface.solid, borderRadius: 16, padding: '28px 28px 24px', width: 360, border: `1px solid ${tokens.border.subtle}`, boxShadow: `0 16px 60px rgba(${tokens.shadowRgb},0.25)`, animation: 'modalEntrar 0.2s ease-out forwards', pointerEvents: 'auto' }}>
          <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 16, fontWeight: 700, color: tokens.text.primary, margin: '0 0 10px' }}>{titulo}</h3>
          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: tokens.text.secondary, margin: '0 0 22px', lineHeight: 1.6 }}>{descricao}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onCancelar} style={{ background: 'transparent', border: `1px solid ${tokens.border.strong}`, borderRadius: 8, color: tokens.text.secondary, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: typography.fontFamily.primary }}>Cancelar</button>
            <button onClick={onConfirmar} style={{ background: `rgba(${tokens.danger.rgb},0.10)`, border: `1px solid rgba(${tokens.danger.rgb},0.30)`, borderRadius: 8, color: tokens.danger.text, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: typography.fontFamily.primary }}>{labelConfirmar}</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── CardDropdown ─────────────────────────────────────────────────────────────

interface CardDropdownProps {
  pos: DropdownPos | null; tokens: ThemeTokens; blocos: Bloco[]
  onFormarBloco: () => void; onCliparEmBloco: (blocoId: number) => void
  onExcluir: () => void; onFechar: () => void
  onEditar: () => void
}

function CardDropdown({ pos, tokens, blocos, onFormarBloco, onCliparEmBloco, onExcluir, onFechar, onEditar }: CardDropdownProps) {
  const [cliparPos, setCliparPos] = useState<{ top: number; left: number } | null>(null)
  const cliparBtnRef = useRef<HTMLButtonElement>(null)
  if (!pos) return null

  const dangerHover = `rgba(${tokens.danger.rgb},0.08)`
  const itemStyle = (danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
    padding: '6px 12px', background: 'transparent', border: 'none',
    color: danger ? tokens.danger.text : tokens.text.primary,
    fontSize: 12, fontFamily: typography.fontFamily.primary,
    cursor: 'pointer', borderRadius: 6, whiteSpace: 'nowrap', transition: 'background 0.12s',
  })

  function abrirClipar(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (cliparPos) { setCliparPos(null); return }
    const r = cliparBtnRef.current?.getBoundingClientRect(); if (!r) return
    const sairaDireita = r.right + 4 + 180 > window.innerWidth
    setCliparPos({ top: r.top, left: sairaDireita ? r.left - 184 : r.right + 4 })
  }

  const top = pos.openUp ? undefined : pos.top
  const bot = pos.openUp ? window.innerHeight - pos.top : undefined

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onMouseDown={e => { e.stopPropagation(); onFechar(); setCliparPos(null) }} />
      <div style={{ position: 'fixed', top, bottom: bot, left: pos.left, background: tokens.surface.glassStrong, backdropFilter: 'blur(16px)', borderRadius: 12, padding: '5px 4px', minWidth: 180, boxShadow: `0 8px 32px rgba(${tokens.shadowRgb},0.25)`, border: `1px solid ${tokens.border.subtle}`, zIndex: 9999, animation: 'dropdownOpen 0.14s cubic-bezier(0.34,1.56,0.64,1) forwards' }} onMouseDown={e => e.stopPropagation()}>
        
        <button style={itemStyle()} onClick={e => { e.stopPropagation(); onEditar(); onFechar() }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${tokens.shadowRgb},0.07)` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <span style={{ fontSize: 12 }}>✏️</span> Editar note
        </button>

        <button style={itemStyle()} onClick={e => { e.stopPropagation(); onFormarBloco(); onFechar() }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${tokens.shadowRgb},0.07)` }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <span style={{ fontSize: 12 }}>🧱</span> Formar bloco
        </button>

        {blocos.length > 0 && (
          <button ref={cliparBtnRef} style={{ ...itemStyle(), justifyContent: 'space-between' }} onClick={abrirClipar} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${tokens.shadowRgb},0.07)` }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 12 }}>📎</span> Clipar em bloco</span>
            <span style={{ fontSize: 10, opacity: 0.45 }}>›</span>
          </button>
        )}
        <div style={{ height: 1, background: `rgba(${tokens.shadowRgb},0.08)`, margin: '3px 8px' }} />
        <button style={itemStyle(true)} onClick={e => { e.stopPropagation(); onExcluir(); onFechar() }} onMouseEnter={e => { e.currentTarget.style.background = dangerHover }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <span style={{ fontSize: 12 }}>🗑️</span> Excluir
        </button>
      </div>
      {cliparPos && (
        <div style={{ position: 'fixed', top: cliparPos.top, left: cliparPos.left, background: tokens.surface.glassStrong, backdropFilter: 'blur(16px)', borderRadius: 12, padding: '5px 4px', minWidth: 172, boxShadow: `0 8px 32px rgba(${tokens.shadowRgb},0.25)`, border: `1px solid ${tokens.border.subtle}`, zIndex: 10000, animation: 'dropdownOpen 0.12s cubic-bezier(0.34,1.56,0.64,1) forwards' }} onMouseDown={e => e.stopPropagation()}>
          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, fontWeight: 700, color: tokens.text.muted, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 10px 5px', margin: 0 }}>Escolher bloco</p>
          {blocos.map(b => (
            <button key={b.id} style={itemStyle()} onClick={e => { e.stopPropagation(); onCliparEmBloco(b.id); onFechar(); setCliparPos(null) }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${tokens.shadowRgb},0.07)` }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontSize: 11 }}>🗂</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{b.nome}</span>
            </button>
          ))}
        </div>
      )}
    </>,
    document.body,
  )
}

// ─── BlocoDropdown ────────────────────────────────────────────────────────────

interface BlocoDropdownProps {
  pos: DropdownPos | null; tokens: ThemeTokens
  onDesfazer: () => void; onDestruir: () => void; onFechar: () => void
}

function BlocoDropdown({ pos, tokens, onDesfazer, onDestruir, onFechar }: BlocoDropdownProps) {
  if (!pos) return null
  const dangerHover = `rgba(${tokens.danger.rgb},0.08)`
  const itemStyle = (danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
    padding: '6px 12px', background: 'transparent', border: 'none',
    color: danger ? tokens.danger.text : tokens.text.primary,
    fontSize: 12, fontFamily: typography.fontFamily.primary,
    cursor: 'pointer', borderRadius: 6, whiteSpace: 'nowrap', transition: 'background 0.12s',
  })
  const top = pos.openUp ? undefined : pos.top
  const bot = pos.openUp ? window.innerHeight - pos.top : undefined
  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onMouseDown={e => { e.stopPropagation(); onFechar() }} />
      <div style={{ position: 'fixed', top, bottom: bot, left: pos.left, background: tokens.surface.glassStrong, backdropFilter: 'blur(16px)', borderRadius: 12, padding: '5px 4px', minWidth: 210, boxShadow: `0 8px 32px rgba(${tokens.shadowRgb},0.25)`, border: `1px solid ${tokens.border.subtle}`, zIndex: 9999, animation: 'dropdownOpen 0.14s cubic-bezier(0.34,1.56,0.64,1) forwards' }} onMouseDown={e => e.stopPropagation()}>
        <button style={itemStyle(true)} onClick={e => { e.stopPropagation(); onDesfazer(); onFechar() }} onMouseEnter={e => { e.currentTarget.style.background = dangerHover }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <span style={{ fontSize: 12 }}>↩️</span> Desfazer bloco
        </button>
        <button style={itemStyle(true)} onClick={e => { e.stopPropagation(); onDestruir(); onFechar() }} onMouseEnter={e => { e.currentTarget.style.background = dangerHover }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <span style={{ fontSize: 12 }}>💥</span> Destruir bloco
        </button>
      </div>
    </>,
    document.body,
  )
}

// ─── PostIt ───────────────────────────────────────────────────────────────────

interface PostItProps {
  note: Note; posX: number; posY: number; isDragging: boolean; isSnapBack: boolean
  destacado: boolean; isNew: boolean; dropdownAberto: boolean; blocos: Bloco[]
  zoom: number; tokens: ThemeTokens
  onAbrir: () => void; onDragStart: (e: ReactMouseEvent) => void
  onDropdownToggle: (e: ReactMouseEvent) => void; onFormarBloco: () => void
  onCliparEmBloco: (blocoId: number) => void; onExcluir: () => void; onDropdownFechar: () => void
  onEditar: () => void
}

function PostIt({ note, posX, posY, isDragging, isSnapBack, destacado, isNew, dropdownAberto, blocos, zoom, tokens, onAbrir, onDragStart, onDropdownToggle, onFormarBloco, onCliparEmBloco, onExcluir, onDropdownFechar, onEditar }: PostItProps) {
  const temFoto = Boolean(note.imagemCapa)
  const dropBtnRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)

  useEffect(() => {
    if (!dropdownAberto) { setDropdownPos(null); return }
    requestAnimationFrame(() => {
      const r = dropBtnRef.current?.getBoundingClientRect(); if (!r) return
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < 160
      setDropdownPos({ top: openUp ? r.top - 4 : r.bottom + 4, left: r.right - 180, openUp })
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
    : destacado ? 'destacarCard 2s ease-in-out' : undefined

  return (
    <div data-card="true" style={{ position: 'absolute', left: posX, top: posY, width: CARD_W, height: CARD_H, ...bgStyle, borderRadius: 12, boxShadow: isDragging ? `0 20px 48px rgba(${tokens.shadowRgb},0.35)` : destacado ? '0 0 0 3px #a78bfa, 0 8px 32px rgba(167,139,250,0.45)' : `0 4px 16px rgba(${tokens.shadowRgb},0.18)`, cursor: isDragging ? 'grabbing' : 'grab', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.50)', transition: isDragging ? 'none' : isSnapBack ? 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s' : 'box-shadow 0.2s', animation, zIndex: isDragging || isSnapBack ? 100 : 1, userSelect: 'none' }}
      onMouseDown={onDragStart} onDoubleClick={e => { e.stopPropagation(); onAbrir() }}>
      {temFoto && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.12) 55%,transparent 100%)', borderRadius: 12 }} />}
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 16px 0', flex: 1, overflow: 'hidden' }}>
        <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 700, color: temFoto ? 'white' : isEscuro(note.cor) ? '#fff' : 'rgba(0,0,0,0.82)', margin: '0 0 6px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{note.tituloCapa || note.titulo}</h3>
        <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, lineHeight: 1.6, color: temFoto ? 'rgba(255,255,255,0.75)' : isEscuro(note.cor) ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.55)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{preview}</p>
      </div>
      <div style={{ position: 'relative', zIndex: 1, padding: '8px 16px 12px' }}>
        <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: temFoto ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)', letterSpacing: '0.02em' }}>🕐 {note.data}</span>
      </div>
      <button ref={dropBtnRef} onClick={e => { e.stopPropagation(); onDropdownToggle(e) }} onMouseDown={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: temFoto ? '#fff' : isEscuro(note.cor) ? '#fff' : tokens.text.primary, fontSize: 15, zIndex: 10, transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.22)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)' }}>⋯</button>
      {dropdownAberto && dropdownPos && (
        <CardDropdown pos={dropdownPos} tokens={tokens} blocos={blocos} onFormarBloco={onFormarBloco} onCliparEmBloco={onCliparEmBloco} onExcluir={onExcluir} onFechar={onDropdownFechar} onEditar={onEditar} />
      )}
    </div>
  )
}

// ─── BlocoTorre ───────────────────────────────────────────────────────────────

interface BlocoTorreProps {
  bloco: Bloco; posX: number; posY: number; isDragging: boolean
  dragPos: { x: number; y: number } | null; dropdownAberto: boolean
  zoom: number; tokens: ThemeTokens
  onAbrir: () => void; onDragStart: (e: ReactMouseEvent) => void
  onDropdownToggle: (e: ReactMouseEvent) => void
  onDesfazer: () => void; onDestruir: () => void
}

function BlocoTorre({ bloco, posX, posY, isDragging, dragPos, dropdownAberto, zoom, tokens, onAbrir, onDragStart, onDropdownToggle, onDesfazer, onDestruir }: BlocoTorreProps) {
  const dropBtnRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)

  const x = isDragging && dragPos ? dragPos.x : posX
  const y = isDragging && dragPos ? dragPos.y : posY
  const cardsOrdenados = bloco.cards
  const visivelCount = Math.min(cardsOrdenados.length, TOWER_MAX_VISIBLE)
  const cardsParaRender = cardsOrdenados.slice(0, visivelCount)
  const cardFrontal = cardsParaRender[0]

  function deslocamento(i: number) { return { dx: i * TOWER_OFFSET_X, dy: i * TOWER_OFFSET_Y } }

  useEffect(() => {
    if (!dropdownAberto) { setDropdownPos(null); return }
    requestAnimationFrame(() => {
      const r = dropBtnRef.current?.getBoundingClientRect(); if (!r) return
      const openUp = window.innerHeight - r.bottom < 140
      setDropdownPos({ top: openUp ? r.top - 4 : r.bottom + 4, left: r.left - 160, openUp })
    })
  }, [dropdownAberto])

  if (!cardFrontal) return null

  return (
    <div data-card="true" style={{ position: 'absolute', left: x, top: y, width: CARD_W + (visivelCount - 1) * TOWER_OFFSET_X, zIndex: isDragging ? 100 : 2, cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', overflow: 'visible' }}
      onMouseDown={onDragStart} onDoubleClick={e => { e.stopPropagation(); onAbrir() }}>
      <div style={{ position: 'absolute', top: -(HEADER_H) + 20, left: 0, width: CARD_W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, pointerEvents: 'none', zIndex: 10 }}>
        <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9.4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: tokens.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, lineHeight: 0.8 }}>{bloco.nome}</span>
        <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 8, fontWeight: 400, letterSpacing: '0.1em', color: tokens.text.muted, opacity: 0.6, lineHeight: 0.8 }}>{bloco.cards.length} notes clipados</span>
      </div>
      <div style={{ position: 'relative', height: CARD_H }}>
        {[...cardsParaRender].reverse().map((card, revIdx) => {
          const indexNaFila = visivelCount - 1 - revIdx
          const { dx, dy } = deslocamento(indexNaFila)
          const ehFrontal = indexNaFila === 0
          const temFoto = Boolean(card.imagemCapa)
          const bgStyle = temFoto
            ? { backgroundImage: `url(${card.imagemCapa})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: card.cor || '#6366f1' }
          return (
            <div key={card.id} style={{ position: 'absolute', top: dy, left: dx, width: CARD_W, height: CARD_H, borderRadius: 12, ...bgStyle, border: '1px solid rgba(255,255,255,0.10)', boxShadow: ehFrontal ? `0 4px 16px rgba(${tokens.shadowRgb},0.28)` : `0 2px 6px rgba(${tokens.shadowRgb},0.18)`, overflow: 'hidden', zIndex: visivelCount - indexNaFila }}>
              {temFoto && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.72) 0%,transparent 60%)' }} />}
              {ehFrontal && (
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 14px 0', flex: 1, overflow: 'hidden' }}>
                    <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 700, color: temFoto ? '#fff' : isEscuro(card.cor) ? '#fff' : 'rgba(0,0,0,0.82)', margin: '0 0 5px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.tituloCapa || card.titulo}</h3>
                    <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 10, lineHeight: 1.55, color: temFoto ? 'rgba(255,255,255,0.7)' : isEscuro(card.cor) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.52)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{card.conteudo}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 10px 14px' }}>
                    <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: temFoto ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.35)' }}>🕐 {card.data}</span>
                    <button ref={dropBtnRef} onClick={e => { e.stopPropagation(); onDropdownToggle(e) }} onMouseDown={e => e.stopPropagation()} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, flexShrink: 0, transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.28)' }}>⋯</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div style={{ position: 'absolute', top: -(HEADER_H - CLIP_OVERLAP), left: 12, zIndex: visivelCount + 5, pointerEvents: 'none' }}>
          <PrendedorSVG width={32} />
        </div>
      </div>
      {dropdownAberto && dropdownPos && (
        <BlocoDropdown pos={dropdownPos} tokens={tokens} onDesfazer={onDesfazer} onDestruir={onDestruir} onFechar={() => setDropdownPos(null)} />
      )}
    </div>
  )
}


// ─── ModalBloco ───────────────────────────────────────────────────────────────
interface ModalBlocoProps {
  bloco: Bloco; tokens: ThemeTokens; isMobile: boolean
  onFechar: () => void
  onRemoverCard: (cardId: number) => void
  onEditarCard: (note: Note) => void
}

function ModalBloco({ bloco, tokens, isMobile, onFechar, onRemoverCard, onEditarCard }: ModalBlocoProps) {
  const cards = bloco.cards
  const [idx, setIdx]         = useState(0)
  const [fase, setFase]       = useState<'idle' | 'virando' | 'chegando'>('idle')
  const [direcao, setDirecao] = useState<'avancar' | 'voltar'>('avancar')
  const [idxSaindo, setIdxSaindo] = useState<number | null>(null)

  useEffect(() => { if (idx >= cards.length && cards.length > 0) setIdx(cards.length - 1) }, [cards.length, idx])
  if (cards.length === 0) return null

  const podAvancar = idx < cards.length - 1
  const podVoltar  = idx > 0
  const animando   = fase !== 'idle'

  // Duração de cada sub-fase em ms
  const T_VIRA  = 320  // card atual gira até 90° (some)
  const T_CHEGA = 320  // próximo card chega de 90° até 0°

  function avancar() {
    if (animando || !podAvancar) return
    setDirecao('avancar'); setIdxSaindo(idx); setFase('virando')
    setTimeout(() => {
      setIdx(prev => prev + 1); setFase('chegando')
      setTimeout(() => { setFase('idle'); setIdxSaindo(null) }, T_CHEGA)
    }, T_VIRA)
  }

  function voltar() {
    if (animando || !podVoltar) return
    setDirecao('voltar'); setIdxSaindo(idx); setFase('virando')
    setTimeout(() => {
      setIdx(prev => prev - 1); setFase('chegando')
      setTimeout(() => { setFase('idle'); setIdxSaindo(null) }, T_CHEGA)
    }, T_VIRA)
  }

  const card    = cards[idx]
  const temFoto = Boolean(card.imagemCapa)
  const bg      = temFoto ? '#1a0f2e' : (card.cor || '#ffffff')
  const tx      = temFoto || isEscuro(card.cor) ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)'
  const sub     = temFoto || isEscuro(card.cor) ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.42)'

  // Cor detrás dos cards
  function versoCor(c: typeof card) {
    if (c.imagemCapa) return '#b0aab8'   // neutro para card com foto
    return ajustarLuminosidade(c.cor || '#6366f1', 0.35)  // versão escura da cor
  }

  // Pilha de cards
  const lequeDireito = cards.slice(idx + 1)

  // Card virando
  const cardSaindo = idxSaindo !== null ? cards[idxSaindo] : null

  // Animação do card
  let cardAnim: string | undefined
  if (fase === 'virando') {
    cardAnim = direcao === 'avancar' ? 'paginaVira 0.32s ease-in forwards' : 'paginaViraVoltar 0.32s ease-in forwards'
  } else if (fase === 'chegando') {
    cardAnim = direcao === 'avancar' ? 'paginaChega 0.32s ease-out forwards' : 'paginaChegaVoltar 0.32s ease-out forwards'
  } else {
    cardAnim = idx === 0 ? 'modalEntrar 0.22s ease-out forwards' : undefined
  }

  return (
    <>
      <style>{`
        @keyframes paginaVira       { from { transform: perspective(1000px) rotateY(  0deg); } to { transform: perspective(1000px) rotateY(-90deg); } }
        @keyframes paginaViraVoltar { from { transform: perspective(1000px) rotateY(  0deg); } to { transform: perspective(1000px) rotateY( 90deg); } }
        @keyframes paginaChega      { from { transform: perspective(1000px) rotateY( 90deg); } to { transform: perspective(1000px) rotateY(  0deg); } }
        @keyframes paginaChegaVoltar{ from { transform: perspective(1000px) rotateY(-90deg); } to { transform: perspective(1000px) rotateY(  0deg); } }
      `}</style>

      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: `rgba(${tokens.shadowRgb},0.12)`, backdropFilter: 'blur(10px)' }} />

      {/*  wrapper externo */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        gap: isMobile ? 12 : 20,
        padding: isMobile ? '16px 0' : 0,
      }}>

        {/* Modal responsivo */}
        <div onClick={e => e.stopPropagation()} style={{
          position: 'relative',
          width: isMobile ? '100%' : 580,
          height: isMobile ? '70vh' : 520,
          maxWidth: isMobile ? '100%' : 580,
          pointerEvents: 'auto',
          perspective: '1200px',
          padding: isMobile ? '0 12px' : 0,
          boxSizing: 'border-box',
        }}>

          {/* Pilha de próximos cards) */}
          {lequeDireito.map((c, i) => {
            const lBg = c.imagemCapa
              ? { backgroundImage: `url(${c.imagemCapa})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: c.cor || '#6366f1' }
            return (
              <div key={c.id} style={{ position: 'absolute', inset: 0, borderRadius: 20, ...lBg, border: `1px solid ${tokens.border.subtle}`, boxShadow: `0 8px 32px rgba(${tokens.shadowRgb},0.25)`, transform: `translateX(${(i + 1) * 18}px) translateY(${(i + 1) * 4}px) scale(${1 - (i + 1) * 0.025})`, zIndex: 2 - Math.min(i, 1), overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.28 + i * 0.08})`, borderRadius: 20 }} />
              </div>
            )
          })}

          {cardSaindo && fase === 'virando' && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: versoCor(cardSaindo), border: `1px solid rgba(255,255,255,0.15)`, boxShadow: `0 24px 80px rgba(${tokens.shadowRgb},0.45)`, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PrendedorSVG width={48} />
            </div>
          )}

          {/* Card principal — frente com conteúdo */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: bg, boxShadow: `0 24px 80px rgba(${tokens.shadowRgb},0.45)`, overflow: 'hidden', zIndex: 50, transformOrigin: 'center center', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', animation: cardAnim, display: 'flex', flexDirection: 'column' }}>
            {temFoto && (
              <div style={{ height: 200, flexShrink: 0, background: `url(${card.imagemCapa}) center/cover`, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(26,15,46,0.95) 100%)' }} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 24px 0', flexShrink: 0 }}>
              <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tx, opacity: 0.4, fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
              <h2 style={{ fontFamily: typography.fontFamily.primary, fontSize: 22, fontWeight: 800, color: tx, margin: 0, lineHeight: 1.3 }}>{card.tituloCapa || card.titulo}</h2>
              <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: sub, margin: '6px 0 0' }}>🕐 {card.data}</p>
            </div>
            <div style={{ padding: '14px 24px', overflowY: 'auto', flex: 1 }}>
              <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 14, lineHeight: 1.8, color: tx, margin: 0, whiteSpace: 'pre-wrap' }}>{card.conteudo}</p>
            </div>
            {/* Botões na base */}
            <div style={{ padding: '14px 24px 20px', flexShrink: 0, display: 'flex', gap: 8, borderTop: `1px solid rgba(${tokens.shadowRgb},0.10)` }}>
              <button onClick={() => onEditarCard(card)} style={{ flex: 1, padding: '9px', borderRadius: 10, background: `rgba(${tokens.shadowRgb},0.08)`, border: `1px solid ${tokens.border.subtle}`, cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: tokens.text.primary }}>
                ✏️ Editar note
              </button>
              <button onClick={() => onRemoverCard(card.id)} style={{ flex: 1, padding: '9px', borderRadius: 10, background: `rgba(${tokens.danger.rgb},0.10)`, border: `1px solid rgba(${tokens.danger.rgb},0.25)`, cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: tokens.danger.text }}>
                Remover do bloco
              </button>
            </div>
          </div>

        </div>

        {/* Navegação */}
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 20, pointerEvents: 'auto' }}>
          <button onClick={voltar} disabled={!podVoltar || animando}
            style={{ width: 38, height: 38, borderRadius: '50%', background: tokens.surface.glass, backdropFilter: 'blur(8px)', border: `1px solid ${tokens.border.subtle}`, cursor: !podVoltar ? 'default' : 'pointer', color: tokens.text.primary, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !podVoltar ? 0.2 : 1, transition: 'background 0.15s' }}
            onMouseEnter={e => { if (podVoltar) e.currentTarget.style.background = tokens.surface.glassHover }}
            onMouseLeave={e => { e.currentTarget.style.background = tokens.surface.glass }}>‹</button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {cards.map((_, i) => <div key={i} style={{ width: i === idx ? 16 : 5, height: 5, borderRadius: 3, background: i === idx ? tokens.accent.solid : tokens.border.subtle, transition: 'width 0.2s, background 0.2s' }} />)}
          </div>
          <button onClick={avancar} disabled={!podAvancar || animando}
            style={{ width: 38, height: 38, borderRadius: '50%', background: tokens.surface.glass, backdropFilter: 'blur(8px)', border: `1px solid ${tokens.border.subtle}`, cursor: !podAvancar ? 'default' : 'pointer', color: tokens.text.primary, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !podAvancar ? 0.2 : 1, transition: 'background 0.15s' }}
            onMouseEnter={e => { if (podAvancar) e.currentTarget.style.background = tokens.surface.glassHover }}
            onMouseLeave={e => { e.currentTarget.style.background = tokens.surface.glass }}>›</button>
        </div>
      </div>
    </>
  )
}



// ─── ModalFormarBloco ─────────────────────────────────────────────────────────

interface ModalFormarBlocoProps {
  tokens: ThemeTokens; onConfirmar: (nome: string) => void; onCancelar: () => void
}

function ModalFormarBloco({ tokens, onConfirmar, onCancelar }: ModalFormarBlocoProps) {
  const [nome, setNome] = useState('')
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  function onChangeNome(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value.length > 30) { setMostrarAviso(true); setTimeout(() => setMostrarAviso(false), 6000) }
    else setNome(e.target.value)
  }

  return (
    <>
      <div onClick={onCancelar} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: `rgba(${tokens.shadowRgb},0.12)`, backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: tokens.surface.solid, borderRadius: 16, padding: '28px 28px 24px', width: 340, border: `1px solid ${tokens.border.subtle}`, boxShadow: `0 16px 60px rgba(${tokens.shadowRgb},0.25)`, animation: 'modalEntrar 0.2s ease-out forwards', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <PrendedorSVG width={26} />
            <div>
              <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 15, fontWeight: 700, color: tokens.text.primary, margin: 0 }}>Formar bloco</h3>
              <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: tokens.text.muted, margin: 0 }}>Agrupe cards relacionados</p>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <input ref={inputRef} value={nome} onChange={onChangeNome} onKeyDown={e => { if (e.key === 'Enter' && nome.trim()) onConfirmar(nome.trim()) }} placeholder="Nome do bloco..."
              style={{ width: '100%', boxSizing: 'border-box', background: tokens.surface.glass, border: `1px solid ${mostrarAviso ? `rgba(${tokens.danger.rgb},0.5)` : tokens.border.subtle}`, borderRadius: 10, padding: '10px 14px', color: tokens.text.primary, fontSize: 13, fontFamily: typography.fontFamily.primary, outline: 'none', transition: 'border 0.2s' }} />
            {mostrarAviso && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: tokens.surface.solid, border: `1px solid rgba(${tokens.danger.rgb},0.35)`, borderRadius: 10, padding: '8px 12px', minWidth: 220, maxWidth: 280, boxShadow: `0 6px 24px rgba(${tokens.shadowRgb},0.35)`, zIndex: 10, pointerEvents: 'none', animation: 'modalEntrar 0.20s ease-out forwards' }}>
                <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: tokens.danger.text, margin: '0 0 4px' }}>Limite de 30 caracteres</p>
                <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: tokens.text.muted, margin: 0, lineHeight: 1.5 }}>Titulos curtos funcionam melhor.</p>
                <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 8, height: 8, background: tokens.surface.solid, borderRight: `1px solid rgba(${tokens.danger.rgb},0.35)`, borderBottom: `1px solid rgba(${tokens.danger.rgb},0.35)` }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button onClick={onCancelar} style={{ background: 'transparent', border: `1px solid ${tokens.border.strong}`, borderRadius: 8, color: tokens.text.secondary, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: typography.fontFamily.primary }}>Cancelar</button>
            <button onClick={() => nome.trim() && onConfirmar(nome.trim())} disabled={!nome.trim()} style={{ background: nome.trim() ? tokens.accent.solid : `rgba(${tokens.shadowRgb},0.10)`, border: 'none', borderRadius: 8, color: nome.trim() ? tokens.accent.onAccent : tokens.text.muted, padding: '8px 20px', cursor: nome.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, fontFamily: typography.fontFamily.primary, transition: 'background 0.15s' }}>Criar bloco</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── ModalLeitura ─────────────────────────────────────────────────────────────

interface ModalLeituraProps {
  note: Note; tokens: ThemeTokens; onFechar: () => void; onExcluido: (id: number) => void
}

function ModalLeitura({ note, tokens, onFechar, onExcluido }: ModalLeituraProps) {
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const temFoto = Boolean(note.imagemCapa)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownAberto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function excluir() { await api.delete(`/notes/${note.id}`); onExcluido(note.id) }

  const bg  = temFoto ? '#1a0f2e' : (note.cor || '#ffffff')
  const tx  = temFoto || isEscuro(note.cor) ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)'
  const sub = temFoto || isEscuro(note.cor) ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.42)'

  return (
    <>
      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: `rgba(${tokens.shadowRgb},0.12)`, backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: `0 32px 80px rgba(${tokens.shadowRgb},0.35)`, animation: 'modalEntrar 0.22s ease-out forwards', pointerEvents: 'auto', border: '1px solid rgba(255,255,255,0.25)' }}>
          {temFoto && <div style={{ position: 'relative', height: 200, flexShrink: 0, background: `url(${note.imagemCapa}) center/cover` }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(26,15,46,0.95) 100%)' }} /></div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '20px 24px 0', flexShrink: 0 }}>
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setDropdownAberto(v => !v)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: tx }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.20)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}>
                <span style={{ letterSpacing: 2 }}>•••</span>
              </button>
              {dropdownAberto && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: tokens.surface.solid, backdropFilter: 'blur(20px)', border: `1px solid ${tokens.border.subtle}`, borderRadius: 14, padding: 8, minWidth: 220, boxShadow: `0 12px 40px rgba(${tokens.shadowRgb},0.25)`, zIndex: 10, animation: 'dropdownOpen 0.18s ease-out forwards' }}>
                  <OpcaoDropdown emoji="🗑️" label="Excluir note" desc="Remove permanentemente" tokens={tokens} onClick={() => { setDropdownAberto(false); setConfirmExcluir(true) }} danger />
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
            <h2 style={{ fontFamily: typography.fontFamily.primary, fontSize: 22, fontWeight: 800, color: tx, margin: 0, lineHeight: 1.3 }}>{note.tituloCapa || note.titulo}</h2>
            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: sub, margin: '6px 0 0' }}>🕐 {note.data}</p>
          </div>
          <div style={{ padding: '16px 24px 24px', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 14, lineHeight: 1.8, color: tx, margin: 0, whiteSpace: 'pre-wrap' }}>{note.conteudo}</p>
          </div>
          <div style={{ padding: '16px 24px 20px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            <button onClick={onFechar} style={{ width: '100%', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.10)', border: 'none', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: tx, opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}>Fechar</button>
          </div>
        </div>
      </div>
      {confirmExcluir && <ModalConfirm titulo="Excluir note?" descricao="Este note sera removido permanentemente. Esta acao nao pode ser desfeita." labelConfirmar="Excluir" tokens={tokens} onConfirmar={excluir} onCancelar={() => setConfirmExcluir(false)} />}
    </>
  )
}


// ─── ModalEditar ──────────────────────────────────────────────────────────────

interface ModalEditarProps {
  note: Note
  tokens: ThemeTokens
  onFechar: () => void
  onAtualizado: (note: Note) => void
}

function ModalEditar({ note, tokens, onFechar, onAtualizado }: ModalEditarProps) {
  const [titulo,       setTitulo]       = useState(note.titulo)
  const [conteudo,     setConteudo]     = useState(note.conteudo)
  const [corBase,      setCorBase]      = useState<string | null>(() => {
    // tenta achar a cor base da paleta mais próxima; se for branco, null
    if (!note.cor || note.cor === '#ffffff') return null
    return PALETA_BASE.find(p => note.cor.startsWith(p.hex.slice(0, 4))) ?.hex ?? note.cor
  })
  const [luminosidade, setLuminosidade] = useState(() => {
    if (!note.cor || note.cor === '#ffffff') return 0.45
    return getLuminosidadeBase(note.cor)
  })
  const [erro,    setErro]    = useState('')
  const [salvando, setSalvando] = useState(false)

  const [fotoPreview, setFotoPreview] = useState<string | null>(note.imagemCapa ?? null)
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null)
  const [removerImagem, setRemoverImagem] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const sliderRef    = useRef<HTMLDivElement>(null)
  const arrastando   = useRef(false)

  const corFinal    = corBase ? ajustarLuminosidade(corBase, luminosidade) : '#ffffff'
  const fundoEscuro = luminosidade < 0.55 && corBase !== null
  const textoEl     = fundoEscuro ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.80)'
  const inputBg     = fundoEscuro ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'

  const calcLum = useCallback((cy: number) => {
    const r = sliderRef.current?.getBoundingClientRect(); if (!r) return
    setLuminosidade(Math.max(0.15, Math.min(0.85, 1 - (cy - r.top) / r.height)))
  }, [])

  useEffect(() => {
    const onM = (e: MouseEvent) => { if (arrastando.current) calcLum(e.clientY) }
    const onU = () => { arrastando.current = false }
    window.addEventListener('mousemove', onM)
    window.addEventListener('mouseup',   onU)
    return () => { window.removeEventListener('mousemove', onM); window.removeEventListener('mouseup', onU) }
  }, [calcLum])

  function onEscolherCor(hex: string) {
    if (corBase === hex) { setCorBase(null); setLuminosidade(0.45) }
    else { setCorBase(hex); setLuminosidade(getLuminosidadeBase(hex)) }
  }

  function onEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]; if (!arquivo) return
    setFotoArquivo(arquivo)
    setRemoverImagem(false)
    const leitor = new FileReader()
    leitor.onload = ev => setFotoPreview(ev.target?.result as string)
    leitor.readAsDataURL(arquivo)
  }

  function removerFoto() {
    setFotoPreview(null)
    setFotoArquivo(null)
    setRemoverImagem(true)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  async function salvar() {
    if (!titulo.trim())   { setErro('Título obrigatório.');  return }
    if (!conteudo.trim()) { setErro('Conteúdo obrigatório.'); return }
    setSalvando(true); setErro('')

    // Atualização otimista imediata
    const noteOtimista: Note = {
      ...note,
      titulo:     titulo.trim(),
      conteudo:   conteudo.trim(),
      cor:        corFinal,
      imagemCapa: fotoPreview,   // base64 local ou null
    }
    onAtualizado(noteOtimista)   // fecha o modal e atualiza o canvas na hora

    // Persistência em background
    try {
      let data: { note: Note }
      if (fotoArquivo) {
        const form = new FormData()
        form.append('titulo',    titulo.trim())
        form.append('conteudo',  conteudo.trim())
        form.append('cor',       corFinal)
        form.append('imagemCapa', fotoArquivo)
        data = await api.put<{ note: Note }>(`/notes/${note.id}`, form)
      } else {
        data = await api.put<{ note: Note }>(`/notes/${note.id}`, {
          titulo:        titulo.trim(),
          conteudo:      conteudo.trim(),
          cor:           corFinal,
          removerImagem: removerImagem ? 'true' : undefined,
        })
      }
      // Substitui o otimista pelo dado real do servidor (URL de imagem definitiva)
      onAtualizado(data.note)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
    }
  }

  const indPct = (1 - (luminosidade - 0.15) / 0.70) * 100

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: `rgba(${tokens.shadowRgb},0.12)`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: corFinal, borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: `0 24px 64px rgba(${tokens.shadowRgb},0.35)`, overflow: 'hidden', transition: 'background 0.25s', border: '1px solid rgba(255,255,255,0.50)' }} onClick={e => e.stopPropagation()}>

        {fotoPreview && (
          <div style={{ position: 'relative', height: 160, background: `url(${fotoPreview}) center/cover` }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom,transparent 40%,rgba(${tokens.shadowRgb},0.55) 100%)` }} />
            <button onClick={removerFoto} style={{ position: 'absolute', top: 10, right: 10, background: `rgba(${tokens.shadowRgb},0.5)`, border: 'none', borderRadius: '50%', width: 28, height: 28, color: 'white', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        <div style={{ padding: 24 }}>
          <style>{`.edit-input::placeholder{color:${fundoEscuro ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.30)'}}`}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 15, fontWeight: 700, color: textoEl, margin: 0 }}>Editar Note</h3>
            <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: textoEl, opacity: 0.5 }}>✕</button>
          </div>

          <input className="edit-input" type="text" placeholder="Título..." value={titulo} onChange={e => setTitulo(e.target.value)}
            style={{ width: '100%', border: 'none', background: inputBg, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: typography.fontFamily.primary, fontWeight: 600, color: textoEl, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
          <textarea className="edit-input" placeholder="O que está na sua cabeça?" value={conteudo} onChange={e => setConteudo(e.target.value)} rows={4}
            style={{ width: '100%', border: 'none', background: inputBg, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: typography.fontFamily.primary, color: textoEl, resize: 'none', marginBottom: 16, boxSizing: 'border-box', outline: 'none' }} />

          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, fontWeight: 600, color: textoEl, opacity: 0.55, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cor do card</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, flex: 1 }}>
              <button onClick={() => { setCorBase(null); setLuminosidade(0.45) }} title="Padrão"
                style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', border: corBase === null ? '3px solid #7c5ab8' : '2px solid #d1d5db', cursor: 'pointer', transform: corBase === null ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s' }} />
              {PALETA_BASE.map(({ hex, nome }) => (
                <button key={hex} onClick={() => onEscolherCor(hex)} title={nome}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: hex, border: corBase === hex ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', transform: corBase === hex ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s', boxShadow: corBase === hex ? '0 0 0 2px rgba(0,0,0,0.18)' : 'none' }} />
              ))}
            </div>
            {corBase && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: textoEl, opacity: 0.5 }}>clar</span>
                <div ref={sliderRef} onMouseDown={e => { arrastando.current = true; calcLum(e.clientY) }} onClick={e => calcLum(e.clientY)}
                  style={{ width: 20, height: 100, borderRadius: 10, cursor: 'ns-resize', position: 'relative', background: `linear-gradient(to bottom,${ajustarLuminosidade(corBase, 0.85)},${ajustarLuminosidade(corBase, 0.45)},${ajustarLuminosidade(corBase, 0.15)})`, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
                  <div style={{ position: 'absolute', left: '50%', top: `${indPct}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: '50%', background: corFinal, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
                </div>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: textoEl, opacity: 0.5 }}>esc</span>
              </div>
            )}
          </div>

          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, fontWeight: 600, color: textoEl, opacity: 0.55, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Foto de capa</p>
          <input ref={inputFotoRef} type="file" accept="image/*" onChange={onEscolherFoto} style={{ display: 'none' }} id="upload-foto-edit" />

          {!fotoPreview
            ? <label htmlFor="upload-foto-edit" style={{ display: 'flex', alignItems: 'center', gap: 8, background: inputBg, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', marginBottom: 20, border: `1.5px dashed ${textoEl}` }}>
                <span style={{ fontSize: 18 }}>🖼️</span>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: textoEl, opacity: 0.65 }}>Clique para adicionar uma foto</span>
              </label>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <img src={fotoPreview} alt="preview" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: textoEl, opacity: 0.8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fotoArquivo?.name ?? 'foto atual'}</span>
                <button onClick={removerFoto} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.danger.text, fontSize: 16 }}>✕</button>
              </div>
          }

          {erro && <p style={{ color: tokens.danger.text, fontSize: 12, fontFamily: typography.fontFamily.primary, marginBottom: 12 }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onFechar} style={{ flex: 1, padding: 10, borderRadius: 8, background: inputBg, border: 'none', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: textoEl, opacity: 0.8 }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: 10, borderRadius: 8, background: `rgba(${tokens.shadowRgb},0.15)`, border: `1.5px solid ${tokens.accent.solid}`, cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 700, color: fundoEscuro ? 'white' : tokens.text.primary, opacity: salvando ? 0.6 : 1 }}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ComposerModal ────────────────────────────────────────────────────────────
interface ComposerModalProps {
  notes: Note[]; blocos: Bloco[]; tokens: ThemeTokens; onFechar: () => void; onCriado: (note: Note) => void
}

function ComposerModal({ notes, blocos, tokens, onFechar, onCriado }: ComposerModalProps) {
  const [titulo, setTitulo]             = useState('')
  const [conteudo, setConteudo]         = useState('')
  const [corBase, setCorBase]           = useState<string | null>(null)
  const [luminosidade, setLuminosidade] = useState(0.45)
  const [erro, setErro]                 = useState('')
  const [salvando, setSalvando]         = useState(false)
  const sliderRef  = useRef<HTMLDivElement>(null)
  const arrastando = useRef(false)

  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const corFinal    = corBase ? ajustarLuminosidade(corBase, luminosidade) : '#ffffff'
  const fundoEscuro = luminosidade < 0.55 && corBase !== null
  const textoEl     = fundoEscuro ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.80)'
  const inputBg     = fundoEscuro ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'

  const calcLum = useCallback((cy: number) => {
    const r = sliderRef.current?.getBoundingClientRect(); if (!r) return
    setLuminosidade(Math.max(0.15, Math.min(0.85, 1 - (cy - r.top) / r.height)))
  }, [])

  useEffect(() => {
    const onM = (e: MouseEvent) => { if (arrastando.current) calcLum(e.clientY) }
    const onU = () => { arrastando.current = false }
    window.addEventListener('mousemove', onM); window.addEventListener('mouseup', onU)
    return () => { window.removeEventListener('mousemove', onM); window.removeEventListener('mouseup', onU) }
  }, [calcLum])

  function onEscolherCor(hex: string) {
    if (corBase === hex) { setCorBase(null); setLuminosidade(0.45) }
    else { setCorBase(hex); setLuminosidade(getLuminosidadeBase(hex)) }
  }

  function onEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setFotoArquivo(arquivo)
    const leitor = new FileReader()
    leitor.onload = ev => setFotoPreview(ev.target?.result as string)
    leitor.readAsDataURL(arquivo)
  }

  function removerFoto() {
    setFotoPreview(null)
    setFotoArquivo(null)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  async function salvar() {
    if (!titulo.trim()) { setErro('Titulo obrigatorio.'); return }
    if (!conteudo.trim()) { setErro('Conteudo obrigatorio.'); return }
    setSalvando(true); setErro('')
    const novaOrdem = maxOrdemAtual(notes, blocos) + 1
    const pos = proximaPosicaoLivre(notes, blocos, window.innerWidth < 640)

    let data: { note: Note }
    if (fotoArquivo) {
      const form = new FormData()
      form.append('titulo', titulo.trim())
      form.append('conteudo', conteudo.trim())
      form.append('cor', corFinal)
      form.append('canvasX', String(pos.x))
      form.append('canvasY', String(pos.y))
      form.append('canvasOrdem', String(novaOrdem))
      form.append('imagemCapa', fotoArquivo)
      data = await api.post<{ note: Note }>('/notes', form)
    } else {
      data = await api.post<{ note: Note }>('/notes', { titulo: titulo.trim(), conteudo: conteudo.trim(), cor: corFinal, canvasX: pos.x, canvasY: pos.y, canvasOrdem: novaOrdem })
    }
    onCriado(data.note)
  }

  const indPct = (1 - (luminosidade - 0.15) / 0.70) * 100

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: `rgba(${tokens.shadowRgb},0.12)`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: corFinal, borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: `0 24px 64px rgba(${tokens.shadowRgb},0.35)`, overflow: 'hidden', transition: 'background 0.25s', border: '1px solid rgba(255,255,255,0.50)' }} onClick={e => e.stopPropagation()}>

        {fotoPreview && (
          <div style={{ position: 'relative', height: 160, background: `url(${fotoPreview}) center/cover` }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom,transparent 40%,rgba(${tokens.shadowRgb},0.55) 100%)` }} />
            <button onClick={removerFoto} style={{ position: 'absolute', top: 10, right: 10, background: `rgba(${tokens.shadowRgb},0.5)`, border: 'none', borderRadius: '50%', width: 28, height: 28, color: 'white', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        <div style={{ padding: 24 }}>
          <style>{`.note-input::placeholder{color:${fundoEscuro ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.30)'}}`}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: typography.fontFamily.primary, fontSize: 15, fontWeight: 700, color: textoEl, margin: 0 }}>Novo Note</h3>
            <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: textoEl, opacity: 0.5 }}>✕</button>
          </div>
          <input className="note-input" type="text" placeholder="Titulo..." value={titulo} onChange={e => setTitulo(e.target.value)} style={{ width: '100%', border: 'none', background: inputBg, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: typography.fontFamily.primary, fontWeight: 600, color: textoEl, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
          <textarea className="note-input" placeholder="O que esta na sua cabeca?" value={conteudo} onChange={e => setConteudo(e.target.value)} rows={4} style={{ width: '100%', border: 'none', background: inputBg, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: typography.fontFamily.primary, color: textoEl, resize: 'none', marginBottom: 16, boxSizing: 'border-box', outline: 'none' }} />
          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, fontWeight: 600, color: textoEl, opacity: 0.55, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cor do card</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, flex: 1 }}>
              <button onClick={() => { setCorBase(null); setLuminosidade(0.45) }} title="Padrao" style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', border: corBase === null ? '3px solid #7c5ab8' : '2px solid #d1d5db', cursor: 'pointer', transform: corBase === null ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s' }} />
              {PALETA_BASE.map(({ hex, nome }) => (
                <button key={hex} onClick={() => onEscolherCor(hex)} title={nome} style={{ width: 28, height: 28, borderRadius: '50%', background: hex, border: corBase === hex ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', transform: corBase === hex ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s', boxShadow: corBase === hex ? '0 0 0 2px rgba(0,0,0,0.18)' : 'none' }} />
              ))}
            </div>
            {corBase && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: textoEl, opacity: 0.5 }}>clar</span>
                <div ref={sliderRef} onMouseDown={e => { arrastando.current = true; calcLum(e.clientY) }} onClick={e => calcLum(e.clientY)} style={{ width: 20, height: 100, borderRadius: 10, cursor: 'ns-resize', position: 'relative', background: `linear-gradient(to bottom,${ajustarLuminosidade(corBase, 0.85)},${ajustarLuminosidade(corBase, 0.45)},${ajustarLuminosidade(corBase, 0.15)})`, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
                  <div style={{ position: 'absolute', left: '50%', top: `${indPct}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: '50%', background: corFinal, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
                </div>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 9, color: textoEl, opacity: 0.5 }}>esc</span>
              </div>
            )}
          </div>

          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, fontWeight: 600, color: textoEl, opacity: 0.55, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Foto de capa</p>
          <input ref={inputFotoRef} type="file" accept="image/*" onChange={onEscolherFoto} style={{ display: 'none' }} id="upload-foto-note" />

          {!fotoPreview
            ? <label htmlFor="upload-foto-note" style={{ display: 'flex', alignItems: 'center', gap: 8, background: inputBg, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', marginBottom: 20, border: `1.5px dashed ${textoEl}` }}>
                <span style={{ fontSize: 18 }}>🖼️</span>
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: textoEl, opacity: 0.65 }}>Clique para adicionar uma foto</span>
              </label>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <img src={fotoPreview} alt="preview" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: textoEl, opacity: 0.8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fotoArquivo?.name}</span>
                <button onClick={removerFoto} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.danger.text, fontSize: 16 }}>✕</button>
              </div>
          }

          {erro && <p style={{ color: tokens.danger.text, fontSize: 12, fontFamily: typography.fontFamily.primary, marginBottom: 12 }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onFechar} style={{ flex: 1, padding: 10, borderRadius: 8, background: inputBg, border: 'none', cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: textoEl, opacity: 0.8 }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: 10, borderRadius: 8, background: `rgba(${tokens.shadowRgb},0.15)`, border: `1.5px solid ${tokens.accent.solid}`, cursor: 'pointer', fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 700, color: fundoEscuro ? 'white' : tokens.text.primary, opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando...' : 'Salvar Note'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── NotesPage ────────────────────────────────────────────────────────────────

export function NotesPage() {
  const [notes, setNotes]                       = useState<Note[]>([])
  const [blocos, setBlocos]                     = useState<Bloco[]>([])
  const [loading, setLoading]                   = useState(true)
  const [erro, setErro]                         = useState('')
  const [composerAberto, setComposerAberto]     = useState(false)
  const [noteLendo, setNoteLendo]               = useState<Note | null>(null)
  const [modalBlocoAberto, setModalBlocoAberto] = useState<Bloco | null>(null)
  const [formarBlocoCardId, setFormarBlocoCardId] = useState<number | null>(null)
  const [dropdownCardId, setDropdownCardId]     = useState<number | null>(null)
  const [dropdownBlocoId, setDropdownBlocoId]   = useState<number | null>(null)
  const [newNoteId, setNewNoteId]               = useState<number | null>(null)
  const [snapBackId, setSnapBackId]             = useState<number | null>(null)
  const [destacado, setDestacado]               = useState<number | null>(null)
  const [confirmModal, setConfirmModal]         = useState<{ tipo: 'desazer' | 'destruir'; blocoId: number } | null>(null)
  const [noteEditando, setNoteEditando] = useState<Note | null>(null)

  const [camX, setCamX] = useState(() => window.innerWidth < 640 ? 8 : CANVAS_GAP)
  const [camY, setCamY] = useState(() => window.innerWidth < 640 ? 8 : CANVAS_GAP)
  const [zoom, setZoom] = useState(() =>
  window.innerWidth < 640
    ? parseFloat((window.innerWidth / (2 * GRID_COL)).toFixed(2))
    : ZOOM_DEFAULT
  )
  const [zoomExpanded, setZoomExpanded] = useState(false)

  const [busca, setBusca]                 = useState('')
  const [buscaExpanded, setBuscaExpanded] = useState(false)
  const buscaInputRef = useRef<HTMLInputElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const panRef        = useRef(false)
  const panStart      = useRef({ x: 0, y: 0, camX: 0, camY: 0 })

  const dragNoteRef   = useRef<{ id: number; startMouseX: number; startMouseY: number; startCardX: number; startCardY: number } | null>(null)
  const dragBlocoRef  = useRef<{ id: number; startMouseX: number; startMouseY: number; startX: number; startY: number } | null>(null)
  const dragOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [draggingNoteId, setDraggingNoteId]   = useState<number | null>(null)
  const [draggingBlocoId, setDraggingBlocoId] = useState<number | null>(null)
  const [dragPos, setDragPos]                 = useState<{ x: number; y: number } | null>(null)

  const { tokens } = useTheme()
  const isMobile = useMobile()

  const pillBgCollapsed = tokens.surface.glass
  const pillBgExpanded  = tokens.surface.glassStrong
  const fabShadowNormal = `0 4px 16px rgba(${tokens.shadowRgb},0.40)`
  const fabShadowHover  = `0 6px 24px rgba(${tokens.shadowRgb},0.55)`
  const zoomBtnAtivo    = tokens.accent.solid
  const zoomBtnInativo  = tokens.surface.glass

  useEffect(() => { carregarTudo() }, [])
  useEffect(() => { if (buscaExpanded) buscaInputRef.current?.focus() }, [buscaExpanded])
  useEffect(() => {
    function handler() { setComposerAberto(true) }
    window.addEventListener('notes:abrirComposer', handler)
    return () => window.removeEventListener('notes:abrirComposer', handler)
  }, [])

  useEffect(() => {
    function onBusca(e: Event) {
      setBusca((e as CustomEvent<string>).detail)
      if (!buscaExpanded) setBuscaExpanded(true)
    }
    function onLimpar() {
      setBusca('')
      setBuscaExpanded(false)
    }
    window.addEventListener('notes:busca',       onBusca   as EventListener)
    window.addEventListener('notes:buscaLimpar', onLimpar)
    return () => {
      window.removeEventListener('notes:busca',       onBusca   as EventListener)
      window.removeEventListener('notes:buscaLimpar', onLimpar)
    }
  }, [buscaExpanded])

  useEffect(() => {
    if (dropdownCardId === null && dropdownBlocoId === null) return
    function handler(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-dropdown-trigger]')) { setDropdownCardId(null); setDropdownBlocoId(null) }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [dropdownCardId, dropdownBlocoId])

  async function carregarTudo() {
    try {
      const [notesData, blocosData] = await Promise.all([
        api.get<{ notes: Note[] }>('/notes'),
        api.get<{ blocos: Bloco[] }>('/blocos'),
      ])
      setNotes(notesData.notes)
      setBlocos(blocosData.blocos)
    } catch { setErro('Erro ao carregar.') }
    finally { setLoading(false) }
  }

  const salvarPosTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  function salvarPosicaoNote(id: number, x: number, y: number, ordem: number) {
    if (salvarPosTimeout.current) clearTimeout(salvarPosTimeout.current)
    salvarPosTimeout.current = setTimeout(() => { api.put(`/notes/${id}/posicao`, { canvasX: x, canvasY: y, canvasOrdem: ordem }) }, 600)
  }
  function salvarPosicaoBloco(id: number, x: number, y: number, ordem: number) {
    api.put(`/blocos/${id}/posicao`, { canvasX: x, canvasY: y, canvasOrdem: ordem })
  }

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return
    if (e.button !== 0) return
    panRef.current = true
    panStart.current = { x: e.clientX, y: e.clientY, camX, camY }
    e.preventDefault()
  }, [camX, camY])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    panRef.current = true
    panStart.current = { x: touch.clientX, y: touch.clientY, camX, camY }
  }, [camX, camY])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (panRef.current) { setCamX(panStart.current.camX + (e.clientX - panStart.current.x)); setCamY(panStart.current.camY + (e.clientY - panStart.current.y)) }
      if (dragNoteRef.current) { const dx = (e.clientX - dragNoteRef.current.startMouseX) / zoom; const dy = (e.clientY - dragNoteRef.current.startMouseY) / zoom; setDragPos({ x: dragNoteRef.current.startCardX + dx, y: dragNoteRef.current.startCardY + dy }) }
      if (dragBlocoRef.current) { const dx = (e.clientX - dragBlocoRef.current.startMouseX) / zoom; const dy = (e.clientY - dragBlocoRef.current.startMouseY) / zoom; setDragPos({ x: dragBlocoRef.current.startX + dx, y: dragBlocoRef.current.startY + dy }) }
    }

    function onTouchMove(e: TouchEvent) {
      if (!panRef.current || e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      setCamX(panStart.current.camX + (touch.clientX - panStart.current.x))
      setCamY(panStart.current.camY + (touch.clientY - panStart.current.y))
    }

    function onUp() {
      panRef.current = false
      if (dragNoteRef.current && dragPos) {
        const { id } = dragNoteRef.current; const sn = snapToGrid(dragPos.x, dragPos.y)
        if (celulaOcupada(notes, blocos, sn.x, sn.y, id, null)) {
          const origin = dragOriginRef.current; setSnapBackId(id)
          setNotes(prev => prev.map(n => n.id === id ? { ...n, canvasX: origin.x, canvasY: origin.y } : n))
          setTimeout(() => setSnapBackId(null), 380)
        } else {
          setNotes(prev => prev.map(n => { if (n.id !== id) return n; salvarPosicaoNote(id, sn.x, sn.y, n.canvasOrdem); return { ...n, canvasX: sn.x, canvasY: sn.y } }))
        }
        dragNoteRef.current = null; setDraggingNoteId(null); setDragPos(null)
      }
      if (dragBlocoRef.current && dragPos) {
        const { id } = dragBlocoRef.current; const sn = snapToGrid(dragPos.x, dragPos.y)
        if (celulaOcupada(notes, blocos, sn.x, sn.y, null, id)) {
          const origin = dragOriginRef.current; setSnapBackId(id)
          setBlocos(prev => prev.map(b => b.id === id ? { ...b, canvasX: origin.x, canvasY: origin.y } : b))
          setTimeout(() => setSnapBackId(null), 380)
        } else {
          setBlocos(prev => prev.map(b => { if (b.id !== id) return b; salvarPosicaoBloco(id, sn.x, sn.y, b.canvasOrdem); return { ...b, canvasX: sn.x, canvasY: sn.y } }))
        }
        dragBlocoRef.current = null; setDraggingBlocoId(null); setDragPos(null)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [zoom, dragPos, notes, blocos])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault(); e.stopPropagation()
    setZoom(prev => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(prev + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)).toFixed(2))))
  }, [])
  useEffect(() => {
    const el = containerRef.current; if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel, containerRef.current])

  function zoomIn()    { setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))) }
  function zoomOut()   { setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))) }
  function zoomReset() {
    const defaultZoom = window.innerWidth < 640
      ? parseFloat((window.innerWidth / (2 * GRID_COL)).toFixed(2))
      : ZOOM_DEFAULT
    setZoom(defaultZoom)
    setCamX(CANVAS_GAP)
    setCamY(CANVAS_GAP)
  }
  function toggleBusca() { if (buscaExpanded) { setBuscaExpanded(false); setBusca('') } else { setBuscaExpanded(true) } }

  function iniciarDragNote(e: ReactMouseEvent, note: Note) {
    e.stopPropagation(); dragOriginRef.current = { x: note.canvasX, y: note.canvasY }
    dragNoteRef.current = { id: note.id, startMouseX: e.clientX, startMouseY: e.clientY, startCardX: note.canvasX, startCardY: note.canvasY }
    setDraggingNoteId(note.id); setDragPos({ x: note.canvasX, y: note.canvasY })
  }
  function iniciarDragBloco(e: ReactMouseEvent, bloco: Bloco) {
    e.stopPropagation(); dragOriginRef.current = { x: bloco.canvasX, y: bloco.canvasY }
    dragBlocoRef.current = { id: bloco.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: bloco.canvasX, startY: bloco.canvasY }
    setDraggingBlocoId(bloco.id); setDragPos({ x: bloco.canvasX, y: bloco.canvasY })
  }

  function navegarAteNote(note: Note) {
    const c = containerRef.current; if (!c) return
    const { width, height } = c.getBoundingClientRect()
    setCamX(width / 2 - (note.canvasX + CARD_W / 2) * zoom); setCamY(height / 2 - (note.canvasY + CARD_H / 2) * zoom)
    setDestacado(note.id); setBuscaExpanded(false); setBusca('')
    setTimeout(() => setDestacado(null), 2000)
  }

  async function excluirNote(id: number) {
    await api.delete(`/notes/${id}`)
    setNotes(prev => prev.filter(n => n.id !== id)); setDropdownCardId(null)
  }

  async function formarBloco(cardId: number, nome: string) {
    const card = notes.find(n => n.id === cardId); if (!card) return
    const data = await api.post<{ bloco: Bloco }>('/blocos', { nome, cardId, canvasX: card.canvasX, canvasY: card.canvasY, canvasOrdem: card.canvasOrdem })
    setBlocos(prev => [...prev, data.bloco]); setNotes(prev => prev.filter(n => n.id !== cardId)); setFormarBlocoCardId(null)
  }

  async function cliparEmBloco(cardId: number, blocoId: number) {
    const data = await api.post<{ bloco: Bloco }>(`/blocos/${blocoId}/clipar`, { cardId })
    setNotes(prev => prev.filter(n => n.id !== cardId)); setBlocos(prev => prev.map(b => b.id === blocoId ? data.bloco : b)); setDropdownCardId(null)
  }

  async function removerCardDoBloco(blocoId: number, cardId: number) {
    const data = await api.post<{ blocoDestruido: boolean; bloco?: Bloco }>(`/blocos/${blocoId}/remover-card`, { cardId })
    if (data.blocoDestruido) { setBlocos(prev => prev.filter(b => b.id !== blocoId)); setModalBlocoAberto(null) }
    else if (data.bloco) { setBlocos(prev => prev.map(b => b.id === blocoId ? data.bloco! : b)); setModalBlocoAberto(data.bloco) }
    const notesData = await api.get<{ notes: Note[] }>('/notes'); setNotes(notesData.notes)
  }

  async function desfazerBloco(blocoId: number) {
    const data = await api.post<{ cardsRestaurados: Note[] }>(`/blocos/${blocoId}/desfazer`, {})
    setBlocos(prev => prev.filter(b => b.id !== blocoId)); setNotes(prev => [...prev, ...data.cardsRestaurados]); setConfirmModal(null)
  }

  async function destruirBloco(blocoId: number) {
    const data = await api.post<{ cardsDestruidos: number[] }>(`/blocos/${blocoId}/destruir`, {})
    setBlocos(prev => prev.filter(b => b.id !== blocoId)); setNotes(prev => prev.filter(n => !data.cardsDestruidos.includes(n.id))); setConfirmModal(null)
  }

  function onNoteCriado(note: Note) {
    setNotes(prev => [...prev, note]); setComposerAberto(false); setNewNoteId(note.id)
    setTimeout(() => {
      navegarAteNote(note)
      setTimeout(() => { setNewNoteId(null); setDestacado(note.id); setTimeout(() => setDestacado(null), 2000) }, 400)
    }, 80)
  }

  function onNoteExcluido(id: number) { setNotes(prev => prev.filter(n => n.id !== id)); setNoteLendo(null) }

  function onNoteAtualizado(note: Note) {
    setNotes(prev => prev.map(n =>
      n.id === note.id
        ? { ...note, data: n.data, canvasX: n.canvasX, canvasY: n.canvasY, canvasOrdem: n.canvasOrdem }
        : n
    ))
    setNoteEditando(prev => prev?.id === note.id ? null : prev)
  }

  const notesEmBlocos = useMemo(() => new Set(blocos.flatMap(b => b.cardIds)), [blocos])

  const notesVisiveis = useMemo(() => {
    const c = containerRef.current; if (!c) return notes
    const { width, height } = c.getBoundingClientRect(); if (width === 0) return notes
    const x0 = (-camX - BUFFER_PX) / zoom, y0 = (-camY - BUFFER_PX) / zoom
    const x1 = (-camX + width + BUFFER_PX) / zoom, y1 = (-camY + height + BUFFER_PX) / zoom
    return notes.filter(n => {
      if (notesEmBlocos.has(n.id)) return false
      const cx = draggingNoteId === n.id && dragPos ? dragPos.x : n.canvasX
      const cy = draggingNoteId === n.id && dragPos ? dragPos.y : n.canvasY
      return cx + CARD_W > x0 && cx < x1 && cy + CARD_H > y0 && cy < y1
    })
  }, [notes, blocos, camX, camY, zoom, draggingNoteId, dragPos, notesEmBlocos])

  const blocosVisiveis = useMemo(() => {
    const c = containerRef.current; if (!c) return blocos
    const { width, height } = c.getBoundingClientRect(); if (width === 0) return blocos
    const x0 = (-camX - BUFFER_PX) / zoom, y0 = (-camY - BUFFER_PX) / zoom
    const x1 = (-camX + width + BUFFER_PX) / zoom, y1 = (-camY + height + BUFFER_PX) / zoom
    return blocos.filter(b => {
      const cx = draggingBlocoId === b.id && dragPos ? dragPos.x : b.canvasX
      const cy = draggingBlocoId === b.id && dragPos ? dragPos.y : b.canvasY
      return cx + CARD_W > x0 && cx < x1 && cy + CARD_H > y0 && cy < y1
    })
  }, [blocos, camX, camY, zoom, draggingBlocoId, dragPos])

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return []
    const q = busca.toLowerCase()
    return notes.filter(n => n.titulo.toLowerCase().includes(q) || n.tituloCapa.toLowerCase().includes(q) || n.conteudo.toLowerCase().includes(q))
  }, [busca, notes])

  const blocoEmConfirm = confirmModal ? blocos.find(b => b.id === confirmModal.blocoId) : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, background: tokens.background.gradient }}>
      <span style={{ fontSize: '2.5rem' }}>📓</span>
      <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: tokens.text.secondary }}>Carregando notes...</p>
    </div>
  )

  if (erro) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: tokens.background.gradient }}>
      <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: tokens.danger.text }}>{erro}</p>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes destacarCard { 0%,100% { box-shadow: 0 4px 16px rgba(120,80,160,0.18); } 30%,60% { box-shadow: 0 0 0 4px #f59e0b, 0 8px 32px rgba(245,158,11,0.55); } }
        @keyframes modalEntrar { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dropdownOpen { from { opacity: 0; transform: scale(0.92) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes zoomExpand { from { opacity: 0; transform: scale(0.85) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cardEntrar { from { opacity: 0; transform: scale(0.55) translateY(-40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      <div ref={containerRef} onMouseDown={onMouseDown} onTouchStart={onTouchStart} style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, overflow: 'hidden', cursor: 'grab', userSelect: 'none', background: tokens.background.gradient }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, rgba(120,80,160,0.18) 1.5px, transparent 1.5px)`, backgroundSize: `${GRID_COL * zoom}px ${GRID_ROW * zoom}px`, backgroundPosition: `${camX}px ${camY}px`, pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${camX}px, ${camY}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform', overflow: 'visible' }}>
          {notes.length === 0 && blocos.length === 0 && (
            <CardBoasVindas camX={camX} camY={camY} zoom={zoom} containerRef={containerRef} tokens={tokens} />
          )}

          {notesVisiveis.map(note => {
            const isDragging = draggingNoteId === note.id
            const posX = isDragging && dragPos ? dragPos.x : note.canvasX
            const posY = isDragging && dragPos ? dragPos.y : note.canvasY
            const blocosSemEsteCard = blocos.filter(b => !b.cardIds.includes(note.id))
            return (
              <PostIt key={note.id} note={note} posX={posX} posY={posY} isDragging={isDragging} isSnapBack={snapBackId === note.id} destacado={destacado === note.id} isNew={newNoteId === note.id} dropdownAberto={dropdownCardId === note.id} blocos={blocosSemEsteCard} zoom={zoom} tokens={tokens}
                onAbrir={() => setNoteLendo(note)}
                onDragStart={e => iniciarDragNote(e, note)}
                onDropdownToggle={e => { e.stopPropagation(); setDropdownCardId(prev => prev === note.id ? null : note.id); setDropdownBlocoId(null) }}
                onFormarBloco={() => { setFormarBlocoCardId(note.id); setDropdownCardId(null) }}
                onCliparEmBloco={blocoId => cliparEmBloco(note.id, blocoId)}
                onExcluir={() => excluirNote(note.id)}
                onDropdownFechar={() => setDropdownCardId(null)}
                onEditar={() => { setNoteEditando(note); setDropdownCardId(null) }}
              />
            )
          })}

          {blocosVisiveis.map(bloco => {
            const isDragging = draggingBlocoId === bloco.id
            return (
              <BlocoTorre key={bloco.id} bloco={bloco} posX={bloco.canvasX} posY={bloco.canvasY} isDragging={isDragging} dragPos={isDragging ? dragPos : null} dropdownAberto={dropdownBlocoId === bloco.id} zoom={zoom} tokens={tokens}
                onAbrir={() => setModalBlocoAberto(bloco)}
                onDragStart={e => iniciarDragBloco(e, bloco)}
                onDropdownToggle={e => { e.stopPropagation(); setDropdownBlocoId(prev => prev === bloco.id ? null : bloco.id); setDropdownCardId(null) }}
                onDesfazer={() => setConfirmModal({ tipo: 'desfazer', blocoId: bloco.id })}
                onDestruir={() => setConfirmModal({ tipo: 'destruir', blocoId: bloco.id })}
              />
            )
          })}
        </div>

        {/* ===== Search Section - pill de busca ===== */}
        {!isMobile && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
          <div style={{ background: buscaExpanded ? pillBgExpanded : pillBgCollapsed, backdropFilter: 'blur(16px)', borderRadius: buscaExpanded ? 14 : 999, border: `1px solid ${tokens.border.subtle}`, boxShadow: buscaExpanded ? `0 8px 28px rgba(${tokens.shadowRgb},0.20)` : 'none', transition: 'border-radius 0.2s, background 0.2s, box-shadow 0.2s', minWidth: buscaExpanded ? 340 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: buscaExpanded ? '0 14px' : '7px 16px', gap: 8, cursor: buscaExpanded ? 'default' : 'pointer' }} onClick={!buscaExpanded ? toggleBusca : undefined}>
              <span style={{ fontSize: 13, opacity: 0.55 }}>🔍</span>
              {buscaExpanded
                ? <input ref={buscaInputRef} type="text" placeholder="Buscar notes..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: typography.fontFamily.primary, fontSize: 13, color: tokens.text.primary, padding: '11px 0', minWidth: 260 }} />
                : <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: tokens.text.secondary, opacity: 0.7 }}>procurar notes</span>
              }
              {buscaExpanded && <button onClick={toggleBusca} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.text.secondary, opacity: 0.5, fontSize: 14, padding: '0 0 0 4px' }}>✕</button>}
            </div>
            {buscaExpanded && busca && (
              <div style={{ borderTop: `1px solid rgba(${tokens.shadowRgb},0.10)` }}>
                {resultadosBusca.length === 0
                  ? <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, color: tokens.text.secondary, padding: '12px 14px', margin: 0 }}>Nenhum resultado para "{busca}"</p>
                  : <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 10, color: tokens.text.muted, padding: '8px 14px 4px', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{resultadosBusca.length} resultado{resultadosBusca.length > 1 ? 's' : ''}</p>
                      {resultadosBusca.map(n => {
                        const qi = n.conteudo.toLowerCase().indexOf(busca.toLowerCase())
                        const trecho = qi >= 0 ? '...' + n.conteudo.slice(Math.max(0, qi - 20), qi + 60) + '...' : n.conteudo.slice(0, 80) + '...'
                        return (
                          <button key={n.id} onMouseDown={() => navegarAteNote(n)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', borderTop: `1px solid rgba(${tokens.shadowRgb},0.06)`, transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${tokens.shadowRgb},0.06)` }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 12, fontWeight: 600, color: tokens.text.primary, margin: '0 0 2px' }}>{n.tituloCapa || n.titulo}</p>
                            <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: tokens.text.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trecho}</p>
                          </button>
                        )
                      })}
                    </div>
                }
              </div>
            )}
          </div>
        </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setComposerAberto(true)}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 28,
            height: 44,
            borderRadius: 999,
            background: tokens.accent.gradientFab,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
            boxShadow: fabShadowNormal,
            zIndex: 60,
            transition: 'transform 0.2s, box-shadow 0.2s',
            fontFamily: typography.fontFamily.primary,
            fontSize: 13,
            fontWeight: 600,
            color: tokens.accent.onAccent,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = fabShadowHover
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = fabShadowNormal
          }}
        >
          <LapisSVG />Criar novo note
        </button>

        {/* ========== Painel de zoom ============= */}
        {!isMobile && (
           <div style={{ position: 'absolute', bottom: 100, right: 28, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {zoomExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'zoomExpand 0.18s ease-out' }}>
                  <BotaoZoom label="+" title="Aproximar" onClick={zoomIn} tokens={tokens} fontSize={20} />
                  <BotaoZoom label={`${Math.round(zoom * 100)}%`} title="Restaurar zoom" onClick={zoomReset} tokens={tokens} width={56} height={32} fontSize={11} />
                  <BotaoZoom label="-" title="Afastar" onClick={zoomOut} tokens={tokens} fontSize={20} />
                </div>
              )}
              <button onClick={() => setZoomExpanded(v => !v)} title="Controles de zoom" style={{ width: 42, height: 42, borderRadius: '50%', background: zoomExpanded ? zoomBtnAtivo : zoomBtnInativo, border: `1px solid ${tokens.border.subtle}`, backdropFilter: 'blur(12px)', boxShadow: `0 2px 10px rgba(${tokens.shadowRgb},0.22)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'background 0.2s' }}>🎮</button>
            </div>
        )}

        {/* ===== Dropdown de busca mobile ===== */}
          {isMobile && buscaExpanded && busca && createPortal(
            <div style={{
              position: 'fixed',
              top: 56,
              left: 0,
              right: 0,
              zIndex: 200,
              background: tokens.surface.glassStrong,
              backdropFilter: 'blur(16px)',
              borderBottom: `1px solid ${tokens.border.subtle}`,
              maxHeight: 'calc(100vh - 56px)',
              overflowY: 'auto',
            }}>
              {resultadosBusca.length === 0
                ? <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: tokens.text.secondary, padding: '16px 20px', margin: 0 }}>
                    Nenhum resultado para "{busca}"
                  </p>
                : <>
                    <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 10, color: tokens.text.muted, padding: '10px 20px 4px', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {resultadosBusca.length} resultado{resultadosBusca.length > 1 ? 's' : ''}
                    </p>
                    {resultadosBusca.map(n => {
                      const qi = n.conteudo.toLowerCase().indexOf(busca.toLowerCase())
                      const trecho = qi >= 0
                        ? '...' + n.conteudo.slice(Math.max(0, qi - 20), qi + 60) + '...'
                        : n.conteudo.slice(0, 80) + '...'
                      return (
                        <button
                          key={n.id}
                          onMouseDown={() => navegarAteNote(n)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: `1px solid rgba(${tokens.shadowRgb},0.08)`, cursor: 'pointer', padding: '12px 20px', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${tokens.shadowRgb},0.07)` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, fontWeight: 600, color: tokens.text.primary, margin: '0 0 3px' }}>
                            {n.tituloCapa || n.titulo}
                          </p>
                          <p style={{ fontFamily: typography.fontFamily.primary, fontSize: 11, color: tokens.text.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {trecho}
                          </p>
                        </button>
                      )
                    })}
                  </>
              }
            </div>,
            document.body,
          )}

      </div>

      {formarBlocoCardId !== null && <ModalFormarBloco tokens={tokens} onConfirmar={nome => formarBloco(formarBlocoCardId, nome)} onCancelar={() => setFormarBlocoCardId(null)} />}
      {modalBlocoAberto && (
        <ModalBloco
          bloco={modalBlocoAberto}
          tokens={tokens}
          isMobile={isMobile}
          onFechar={() => setModalBlocoAberto(null)}
          onRemoverCard={cardId => removerCardDoBloco(modalBlocoAberto.id, cardId)}
          onEditarCard={note => { setModalBlocoAberto(null); setNoteEditando(note) }}
        />
      )}
      {composerAberto && <ComposerModal notes={notes} blocos={blocos} tokens={tokens} onFechar={() => setComposerAberto(false)} onCriado={onNoteCriado} />}
      {noteLendo && <ModalLeitura note={noteLendo} tokens={tokens} onFechar={() => setNoteLendo(null)} onExcluido={onNoteExcluido} />}
      {confirmModal && blocoEmConfirm && (
        <ModalConfirm
          titulo={confirmModal.tipo === 'desfazer' ? 'Desfazer bloco?' : 'Destruir bloco?'}
          descricao={confirmModal.tipo === 'desfazer' ? `O bloco "${blocoEmConfirm.nome}" sera dissolvido e todos os ${blocoEmConfirm.cards.length} cards voltarao ao canvas. Esta acao nao pode ser desfeita.` : `O bloco "${blocoEmConfirm.nome}" e todos os seus ${blocoEmConfirm.cards.length} cards serao excluidos permanentemente. Esta acao nao pode ser desfeita.`}
          labelConfirmar={confirmModal.tipo === 'desfazer' ? 'Desfazer bloco' : 'Destruir tudo'}
          tokens={tokens}
          onConfirmar={() => confirmModal.tipo === 'desfazer' ? desfazerBloco(confirmModal.blocoId) : destruirBloco(confirmModal.blocoId)}
          onCancelar={() => setConfirmModal(null)}
        />
      )}

      {noteEditando && (
        <ModalEditar
          note={noteEditando}
          tokens={tokens}
          onFechar={() => setNoteEditando(null)}
          onAtualizado={onNoteAtualizado}
        />
      )}
    </>
  )
}
