import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from './AuthLayout'
import {
  CampoTexto,
  CampoSenha,
  BotaoPrimario,
  ErroGeral,
  TituloAuth,
  LinkAuth,
  IconeUsuario,
} from './AuthComponents'

export function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [username,   setUsername]   = useState('')
  const [senha,      setSenha]      = useState('')
  const [erro,       setErro]       = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async () => {
    if (!username || !senha) {
      setErro('Preencha usuário e senha.')
      return
    }
    setErro('')
    setCarregando(true)
    try {
      await login(username, senha)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Usuário ou senha incorretos.')
    } finally {
      setCarregando(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <AuthLayout>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-40px' }}>
            <img
                src="/mynotes_logo.png"
                alt="Mynotes"
                style={{ width: '180px', height: 'auto', filter: 'drop-shadow(0 4px 12px rgba(60,10,100,0.20))' }}
            />
        </div>

      <TituloAuth>Entrar</TituloAuth>

      {erro && <ErroGeral mensagem={erro} />}

      <CampoTexto
        id="id_username" name="username"
        placeholder="Usuário"
        value={username} onChange={setUsername}
        autoComplete="username"
        icone={<IconeUsuario />}
        onKeyDown={onEnter}
      />

      <CampoSenha
        id="id_senha" name="senha"
        placeholder="Senha"
        value={senha} onChange={setSenha}
        autoComplete="current-password"
        onKeyDown={onEnter}
      />

      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        margin: '4px 0 16px',
        fontSize: '12px', fontWeight: 300,
        fontFamily: "'Poppins', sans-serif",
      }}>
        <LinkAuth href="/senha/reset">Esqueceu a senha?</LinkAuth>
      </div>

      <BotaoPrimario carregando={carregando} onClick={handleSubmit}>
        Entrar
      </BotaoPrimario>

      <div style={{ marginTop: '20px' }}>
        <p style={{
          textAlign: 'center', fontSize: '12px', fontWeight: 400,
          color: 'rgba(60,20,100,0.50)', marginBottom: '10px',
          fontFamily: 'Poppins, sans-serif', letterSpacing: '0.02em',
        }}>
          Ou entre com:
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled
            style={{
              flex: 1, height: '44px', borderRadius: '12px',
              border: '1px solid rgba(200,185,220,0.50)',
              background: 'rgba(255,255,255,0.70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 500, fontFamily: 'Poppins, sans-serif',
              color: 'rgba(40,15,80,0.75)', cursor: 'not-allowed', opacity: 0.7,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <button
            type="button"
            disabled
            style={{
              flex: 1, height: '44px', borderRadius: '12px',
              border: '1px solid rgba(200,185,220,0.50)',
              background: 'rgba(220,210,235,0.60)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 500, fontFamily: 'Poppins, sans-serif',
              color: 'rgba(40,15,80,0.75)', cursor: 'not-allowed', opacity: 0.7,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(40,15,80,0.80)">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub
          </button>
        </div>
      </div>

      <p style={{
        textAlign: 'center', fontSize: '14px', fontWeight: 300,
        color: 'rgba(60,20,100,0.70)',
        fontFamily: 'Poppins, sans-serif',
        position: 'absolute',
        bottom: '-45px',
        left: 0,
        right: 0,
        zIndex: 20,
        }}>
        Não tem uma conta? <LinkAuth href="/registrar">Criar conta</LinkAuth>
      </p>
      
    </AuthLayout>
  )
}
