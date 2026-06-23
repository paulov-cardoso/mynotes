import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { typography } from '../design/tokens'
import type { ThemeName, ThemeTokens } from '../design/themes'

const NAV_TEXT_PRIMARY   = 'rgba(255,255,255,0.95)'
const NAV_TEXT_SECONDARY = 'rgba(255,255,255,0.70)'
const NAV_SHADOW         = '0 2px 8px rgba(0,0,0,0.30)'

function useMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

interface ToggleTemaProps {
  ativo: boolean
  tokens: ThemeTokens
  onToggle: () => void
  label: string
}

function ToggleTema({ ativo, tokens, onToggle, label }: ToggleTemaProps) {
  return (
    <button
      onClick={onToggle}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <span style={{
        fontFamily: typography.fontFamily.primary,
        fontSize: 12,
        fontWeight: 600,
        color: NAV_TEXT_SECONDARY,
      }}>
        {label}
      </span>
      <span style={{
        width: 34,
        height: 18,
        borderRadius: 999,
        background: ativo ? tokens.accent.solid : 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.30)',
        position: 'relative',
        display: 'inline-block',
        transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute',
          top: 1,
          left: ativo ? 17 : 1,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: ativo ? tokens.accent.onAccent : '#ffffff',
          transition: 'left 0.2s',
        }} />
      </span>
    </button>
  )
}

function HamburguerIcon({ aberto }: { aberto: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <style>{`
        .hb-l1 { transform-origin: 11px 7px; transition: transform 0.22s cubic-bezier(0.4,0,0.2,1); }
        .hb-l2 { transform-origin: 11px 11px; transition: opacity 0.18s, transform 0.22s cubic-bezier(0.4,0,0.2,1); }
        .hb-l3 { transform-origin: 11px 15px; transition: transform 0.22s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
      <rect className="hb-l1" x="3" y="6" width="16" height="2" rx="1" fill={NAV_TEXT_PRIMARY}
        style={{ transform: aberto ? 'translateY(4px) rotate(45deg)' : 'none' }} />
      <rect className="hb-l2" x="3" y="10" width="16" height="2" rx="1" fill={NAV_TEXT_PRIMARY}
        style={{ opacity: aberto ? 0 : 1 }} />
      <rect className="hb-l3" x="3" y="14" width="16" height="2" rx="1" fill={NAV_TEXT_PRIMARY}
        style={{ transform: aberto ? 'translateY(-4px) rotate(-45deg)' : 'none' }} />
    </svg>
  )
}

function BuscaMobileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke={NAV_TEXT_PRIMARY} strokeWidth="1.5" strokeOpacity="0.7" />
      <path d="M10 10L13.5 13.5" stroke={NAV_TEXT_PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  )
}

interface SidebarMobileProps {
  aberto: boolean
  onFechar: () => void
  tokens: ThemeTokens
  theme: ThemeName
  alternarTema: (t: ThemeName) => void
  onLogout: () => void
  nomeExibicao: string | undefined
}

function SidebarMobile({ aberto, onFechar, tokens, theme, alternarTema, onLogout, nomeExibicao }: SidebarMobileProps) {
  function abrirComposer() {
    window.dispatchEvent(new CustomEvent('notes:abrirComposer'))
    onFechar()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onFechar}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.40)',
          backdropFilter: 'blur(4px)',
          opacity: aberto ? 1 : 0,
          pointerEvents: aberto ? 'auto' : 'none',
          transition: 'opacity 0.22s',
        }}
      />

      {/* Painel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          zIndex: 201,
          background: tokens.background.navGradient,
          boxShadow: '4px 0 32px rgba(0,0,0,0.35)',
          transform: aberto ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 0 32px',
          overflowY: 'auto',
        }}
      >
        {/* Header do sidebar */}
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          flexShrink: 0,
        }}>
          <img
            src="/mynotes_logo.png"
            alt="Mynotes"
            style={{ height: 80, width: 'auto', objectFit: 'contain' }}
          />
          <button
            onClick={onFechar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: NAV_TEXT_SECONDARY,
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Saudação */}
        {nomeExibicao && (
          <div style={{
            padding: '18px 20px 10px',
            fontFamily: typography.fontFamily.primary,
            fontSize: 13,
            color: NAV_TEXT_SECONDARY,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 8,
          }}>
            Olá, <strong style={{ color: NAV_TEXT_PRIMARY }}>{nomeExibicao}</strong>
          </div>
        )}

        {/* Toggles */}
        <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ToggleTema
            label="Dark mode"
            ativo={theme === 'darkmode'}
            tokens={tokens}
            onToggle={() => alternarTema('darkmode')}
          />
          <ToggleTema
            label="Color mode"
            ativo={theme === 'colormode'}
            tokens={tokens}
            onToggle={() => alternarTema('colormode')}
          />
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 20px' }} />

        {/* Ações */}
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={abrirComposer}
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.20)',
              borderRadius: 10,
              color: NAV_TEXT_PRIMARY,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: typography.fontFamily.primary,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>✏️</span>
            Tenha uma ideia
          </button>

          <button
            onClick={() => { onFechar(); onLogout() }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              color: NAV_TEXT_SECONDARY,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: typography.fontFamily.primary,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>🚪</span>
            Sair
          </button>
        </div>
      </div>
    </>
  )
}

export function Navbar() {
  const { usuario, logout } = useAuth()
  const { theme, tokens, setTheme } = useTheme()
  const navigate  = useNavigate()
  const isMobile  = useMobile()
  const [sidebarAberto, setSidebarAberto] = useState(false)
  const [buscaMobileAberta, setBuscaMobileAberta] = useState(false)
  const [buscaMobile, setBuscaMobile] = useState('')
  const buscaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (buscaMobileAberta) {
      setTimeout(() => buscaInputRef.current?.focus(), 50)
    } else {
      setBuscaMobile('')
      window.dispatchEvent(new CustomEvent('notes:buscaLimpar'))
    }
  }, [buscaMobileAberta])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('notes:busca', { detail: buscaMobile }))
  }, [buscaMobile])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function alternarTema(destino: ThemeName) {
    setTheme(theme === destino ? 'pastel' : destino)
  }

  function abrirComposer() {
    window.dispatchEvent(new CustomEvent('notes:abrirComposer'))
  }

  // ── Desktop ────────────────────────────────────────────────────────────────

  if (!isMobile) {
    return (
      <nav style={{
        position: 'sticky', top: 0, zIndex: 70, height: 56, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: tokens.background.navGradient, boxShadow: NAV_SHADOW,
      }}>
        <img src="/mynotes_logo.png" alt="Mynotes" style={{ height: 100, width: 'auto', objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <ToggleTema label="Dark mode"  ativo={theme === 'darkmode'}  tokens={tokens} onToggle={() => alternarTema('darkmode')} />
          <ToggleTema label="Color mode" ativo={theme === 'colormode'} tokens={tokens} onToggle={() => alternarTema('colormode')} />
          {usuario && (
            <span style={{ fontFamily: typography.fontFamily.primary, fontSize: 13, color: NAV_TEXT_SECONDARY }}>
              Olá, {usuario.nomeExibicao}
            </span>
          )}
          <button onClick={abrirComposer} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.30)', borderRadius: 999, color: NAV_TEXT_PRIMARY, padding: '6px 16px', fontSize: 13, fontWeight: 600, fontFamily: typography.fontFamily.primary, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
            Tenha uma ideia
          </button>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.30)', borderRadius: 999, color: NAV_TEXT_PRIMARY, padding: '6px 16px', fontSize: 13, fontWeight: 600, fontFamily: typography.fontFamily.primary, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
            Sair
          </button>
        </div>
      </nav>
    )
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 70, height: 56, padding: '0 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: tokens.background.navGradient, boxShadow: NAV_SHADOW,
      }}>
        {/* Hambúrguer */}
        <button
          onClick={() => setSidebarAberto(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <HamburguerIcon aberto={sidebarAberto} />
        </button>

        {/* Logo */}
        <img
          src="/mynotes_logo.png"
          alt="Mynotes"
          style={{ height: 72, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />

        {/* Pill de busca inline */}
        <div style={{ flex: 1, position: 'relative' }}>
          {buscaMobileAberta ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.14)',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(12px)',
              padding: '0 12px',
              height: 34,
              gap: 8,
            }}>
              <BuscaMobileIcon />
              <input
                ref={buscaInputRef}
                type="text"
                placeholder="Buscar notes..."
                value={buscaMobile}
                onChange={e => setBuscaMobile(e.target.value)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontFamily: typography.fontFamily.primary,
                  fontSize: 13,
                  color: NAV_TEXT_PRIMARY,
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => setBuscaMobileAberta(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAV_TEXT_SECONDARY, fontSize: 14, padding: 0, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBuscaMobileAberta(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.10)',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)',
                padding: '0 14px',
                height: 34,
                width: '100%',
                cursor: 'pointer',
              }}
            >
              <BuscaMobileIcon />
              <span style={{
                fontFamily: typography.fontFamily.primary,
                fontSize: 12,
                color: NAV_TEXT_SECONDARY,
                opacity: 0.8,
              }}>
                Procurar notas...
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Resultados de busca mobile — dropdown abaixo da navbar */}
      {buscaMobileAberta && buscaMobile && (
        <div style={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          zIndex: 69,
          background: tokens.surface.solid,
          borderBottom: `1px solid ${tokens.border.subtle}`,
          boxShadow: `0 8px 24px rgba(${tokens.shadowRgb},0.25)`,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          <ResultadosBuscaMobile
            busca={buscaMobile}
            tokens={tokens}
            onNavegar={() => setBuscaMobileAberta(false)}
          />
        </div>
      )}

      <SidebarMobile
        aberto={sidebarAberto}
        onFechar={() => setSidebarAberto(false)}
        tokens={tokens}
        theme={theme}
        alternarTema={alternarTema}
        onLogout={handleLogout}
        nomeExibicao={usuario?.nomeExibicao}
      />
    </>
  )
}

// Componente auxiliar que lê os resultados via evento
function ResultadosBuscaMobile({ busca, tokens, onNavegar }: {
  busca: string
  tokens: ThemeTokens
  onNavegar: () => void
}) {
  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{
        fontFamily: typography.fontFamily.primary,
        fontSize: 10,
        color: tokens.text.muted,
        padding: '8px 16px 4px',
        margin: 0,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Buscando por "{busca}"...
      </p>
      <p style={{
        fontFamily: typography.fontFamily.primary,
        fontSize: 12,
        color: tokens.text.secondary,
        padding: '4px 16px 12px',
        margin: 0,
      }}>
        Os notes destacados aparecerão no mural.
      </p>
    </div>
  )
}
