import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { typography } from '../design/tokens'
import type { ThemeName, ThemeTokens } from '../design/themes'

const NAV_TEXT_PRIMARY   = 'rgba(255,255,255,0.95)'
const NAV_TEXT_SECONDARY = 'rgba(255,255,255,0.70)'
const NAV_SHADOW         = '0 2px 8px rgba(0,0,0,0.30)'

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
      <span
        style={{
          width: 34,
          height: 18,
          borderRadius: 999,
          background: ativo ? tokens.accent.solid : 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.30)',
          position: 'relative',
          display: 'inline-block',
          transition: 'background 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 1,
            left: ativo ? 17 : 1,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: ativo ? tokens.accent.onAccent : '#ffffff',
            transition: 'left 0.2s',
          }}
        />
      </span>
    </button>
  )
}

export function Navbar() {
  const { usuario, logout } = useAuth()
  const { theme, tokens, setTheme } = useTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function alternarTema(destino: ThemeName) {
    setTheme(theme === destino ? 'pastel' : destino)
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 70,
        height: 56,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: tokens.background.navGradient,
        boxShadow: NAV_SHADOW,
      }}
    >
      <img
        src="/mynotes_logo.png"
        alt="Mynotes"
        style={{ height: 32, width: 'auto', objectFit: 'contain' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {usuario && (
          <span style={{
            fontFamily: typography.fontFamily.primary,
            fontSize: 13,
            color: NAV_TEXT_SECONDARY,
          }}>
            Olá, {usuario.nomeExibicao}
          </span>
        )}

        <ToggleTema label="Dark mode"  ativo={theme === 'darkmode'}  tokens={tokens} onToggle={() => alternarTema('darkmode')} />
        <ToggleTema label="Color mode" ativo={theme === 'colormode'} tokens={tokens} onToggle={() => alternarTema('colormode')} />

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.30)',
            borderRadius: 999,
            color: NAV_TEXT_PRIMARY,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: typography.fontFamily.primary,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
