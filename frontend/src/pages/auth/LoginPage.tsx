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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
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

      <p style={{
        textAlign: 'center', fontSize: '14px', fontWeight: 300,
        color: 'rgba(255,255,255,0.80)', marginTop: '16px',
        fontFamily: "'Poppins', sans-serif",
      }}>
        Não tem uma conta? <LinkAuth href="/registrar">Criar conta</LinkAuth>
      </p>
    </AuthLayout>
  )
}
