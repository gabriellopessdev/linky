-- CreateTable
CREATE TABLE "links" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "long_url" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "links_code_key" ON "links"("code");

-- CreateIndex
CREATE INDEX "links_user_id_idx" ON "links"("user_id");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
