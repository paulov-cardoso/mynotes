import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listarBlocos,
  criarBloco,
  cliparEmBloco,
  removerCardDoBloco,
  desfazerBloco,
  destruirBloco,
  atualizarPosicaoBloco,
} from '../controllers/blocos.controller'

const router = Router()

router.use(authenticate)

router.get('/',               listarBlocos)
router.post('/',              criarBloco)
router.post('/:id/clipar',    cliparEmBloco)
router.post('/:id/remover-card', removerCardDoBloco)
router.post('/:id/desfazer',  desfazerBloco)
router.post('/:id/destruir',  destruirBloco)
router.put('/:id/posicao',    atualizarPosicaoBloco)

export default router
