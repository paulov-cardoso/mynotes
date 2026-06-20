import multer from 'multer'
import path from 'path'
import fs from 'fs'

const PASTA_UPLOADS = path.join(__dirname, '../../uploads/notes')

if (!fs.existsSync(PASTA_UPLOADS)) {
  fs.mkdirSync(PASTA_UPLOADS, { recursive: true })
}

const armazenamento = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PASTA_UPLOADS)
  },
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname)
    const nomeUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`
    cb(null, nomeUnico)
  },
})

function filtrarImagem(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Arquivo precisa ser uma imagem.'))
  }
}

export const uploadImagemCapa = multer({
  storage: armazenamento,
  fileFilter: filtrarImagem,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('imagemCapa')
