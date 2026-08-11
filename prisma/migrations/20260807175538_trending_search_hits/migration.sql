-- AlterTable
ALTER TABLE "TrendingSearch" ADD COLUMN     "hits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TrendingSearch_isActive_hits_idx" ON "TrendingSearch"("isActive", "hits");
