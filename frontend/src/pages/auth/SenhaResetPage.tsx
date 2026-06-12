import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import {
  CampoTexto,
  BotaoPrimario,
  TituloAuth,
  LinkAuth,
  IconeEmail,
} from './AuthComponents'

export function SenhaResetPage() {
  const navigate     = useNavigate()
  const [email,      setEmail]      = useState('')
  const [enviado,    setEnviado]    = useState(false)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async () => {
    if (!email) return
    setCarregando(true)
    await new Promise(r => setTimeout(r, 800))
    setCarregando(false)
    setEnviado(true)
  }

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  if (enviado) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', fontSize: '60px', marginBottom: '20px' }} aria-hidden="true">📧</div>
        <h1 style={{
          textAlign: 'center', color: 'white', fontWeight: 700,
          fontSize: '30px', marginBottom: '12px',
          fontFamily: "'Poppins', sans-serif",
          textShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>
          Email enviado
        </h1>
        <p style={{
          textAlign: 'center', fontSize: '14px', fontWeight: 300,
          color: 'rgba(255,255,255,0.70)', marginBottom: '28px',
          lineHeight: 1.6, fontFamily: "'Poppins', sans-serif",
        }}>
          Funcionalidade em breve. Verifique sua caixa de entrada quando disponível.
        </p>
        <BotaoPrimario type="button" onClick={() => navigate('/login')}>
          Voltar ao login
        </BotaoPrimario>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <TituloAuth>Esqueci a senha</TituloAuth>
      <p style={{
        textAlign: 'center', fontSize: '14px', fontWeight: 300,
        color: 'rgba(255,255,255,0.65)', marginBottom: '24px',
        fontFamily: "'Poppins', sans-serif",
      }}>
        Digite seu email e enviaremos um link para redefinir sua senha.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <CampoTexto
          id="id_email" name="email" type="email"
          placeholder="Seu email"
          value={email} onChange={setEmail}
          autoComplete="email"
          icone={<IconeEmail />}
          onKeyDown={onEnter}
        />
      </div>

      <BotaoPrimario carregando={carregando} onClick={handleSubmit}>
        Enviar link
      </BotaoPrimario>

      <p style={{
        textAlign: 'center', fontSize: '14px', fontWeight: 300,
        color: 'rgba(255,255,255,0.80)', marginTop: '16px',
        fontFamily: "'Poppins', sans-serif",
      }}>
        Lembrou a senha? <LinkAuth href="/login">Entrar</LinkAuth>
      </p>
    </AuthLayout>
  )
}
