import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listarNotes, criarNote, atualizarPosicao, excluirNote } from '../controllers/notes.controller'
import { uploadImagemCapa } from '../middlewares/upload.middleware'

const router = Router()

router.use(authenticate)

router.get('/', listarNotes)
router.post('/', uploadImagemCapa, criarNote)
router.put('/:id/posicao', atualizarPosicao)
router.delete('/:id', excluirNote)

export default router