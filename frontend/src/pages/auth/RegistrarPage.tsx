import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from './AuthLayout'
import {
  CampoTexto,
  CampoSenha,
  ValidatorSenha,
  BotaoPrimario,
  ErroGeral,
  TituloAuth,
  LinkAuth,
  IconeUsuario,
  IconeEdicao,
} from './AuthComponents'

interface Erros {
  username?:     string
  nomeExibicao?: string
  password1?:    string
  password2?:    string
}

export function RegistrarPage() {
  const { registrar } = useAuth()
  const navigate      = useNavigate()

  const [username,     setUsername]     = useState('')
  const [nomeExibicao, setNomeExibicao] = useState('')
  const [password1,    setPassword1]    = useState('')
  const [password2,    setPassword2]    = useState('')
  const [senhaFocada,  setSenhaFocada]  = useState(false)
  const [erros,        setErros]        = useState<Erros>({})
  const [erroGeral,    setErroGeral]    = useState('')
  const [carregando,   setCarregando]   = useState(false)

  const handleSubmit = async () => {
    setErros({})
    setErroGeral('')

    if (password1 !== password2) {
      setErros({ password2: 'As senhas não coincidem.' })
      return
    }

    setCarregando(true)
    try {
      await registrar(username, nomeExibicao, password1)
      navigate('/')
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Erro ao criar conta.')
    } finally {
      setCarregando(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <AuthLayout>
      <TituloAuth>Cadastro</TituloAuth>

      {erroGeral && <ErroGeral mensagem={erroGeral} />}

      <CampoTexto
        id="id_username" name="username"
        placeholder="Usuário"
        value={username} onChange={setUsername}
        autoComplete="username"
        erro={erros.username}
        icone={<IconeUsuario />}
        onKeyDown={onEnter}
      />

      <CampoTexto
        id="id_nome_exibicao" name="nomeExibicao"
        placeholder="Como quer ser chamado?"
        value={nomeExibicao} onChange={setNomeExibicao}
        erro={erros.nomeExibicao}
        icone={<IconeEdicao />}
        onKeyDown={onEnter}
      />

      <div>
        <CampoSenha
          id="campo-senha" name="password1"
          placeholder="Senha"
          value={password1} onChange={setPassword1}
          autoComplete="new-password"
          erro={erros.password1}
          onKeyDown={onEnter}
        />
        <div
          onFocus={() => setSenhaFocada(true)}
          onBlur={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setSenhaFocada(false)
            }
          }}
        >
          <ValidatorSenha senha={password1} visivel={senhaFocada && password1.length > 0} />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <CampoSenha
          id="campo-confirma" name="password2"
          placeholder="Confirme a senha"
          value={password2} onChange={setPassword2}
          autoComplete="new-password"
          erro={erros.password2}
          onKeyDown={onEnter}
        />
      </div>

      <BotaoPrimario carregando={carregando} onClick={handleSubmit}>
        Criar conta
      </BotaoPrimario>

      <p style={{
        textAlign: 'center', fontSize: '14px', fontWeight: 300,
        color: 'rgba(255,255,255,0.80)', marginTop: '16px',
        fontFamily: "'Poppins', sans-serif",
      }}>
        Já possui uma conta? <LinkAuth href="/login">Entrar</LinkAuth>
      </p>
    </AuthLayout>
  )
}
