import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listarNotes, criarNote, atualizarPosicao, excluirNote } from '../controllers/notes.controller'
import { uploadImagemCapa } from '../middlewares/upload.middleware'

const router = Router()

router.use(authenticate)

router.get('/', listarNotes)
router.post('/', criarNote)
router.put('/:id/posicao', atualizarPosicao)
router.delete('/:id', excluirNote)
router.post('/', uploadImagemCapa, criarNote)

export default router