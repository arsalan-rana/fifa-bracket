-- AlterTable
ALTER TABLE "LeagueMember" ADD COLUMN     "statusMessage" TEXT,
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TauntReaction" (
    "id" TEXT NOT NULL,
    "tauntId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TauntReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TauntReaction_tauntId_userId_key" ON "TauntReaction"("tauntId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_leagueId_idx" ON "Notification"("userId", "leagueId");

-- AddForeignKey
ALTER TABLE "TauntReaction" ADD CONSTRAINT "TauntReaction_tauntId_fkey" FOREIGN KEY ("tauntId") REFERENCES "Taunt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TauntReaction" ADD CONSTRAINT "TauntReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
