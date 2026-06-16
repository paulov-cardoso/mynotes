-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tituloCapa" TEXT NOT NULL DEFAULT '',
    "conteudo" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#ffffff',
    "imagemCapa" TEXT,
    "clips" INTEGER NOT NULL DEFAULT 0,
    "canvasX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "canvasY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "canvasOrdem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
