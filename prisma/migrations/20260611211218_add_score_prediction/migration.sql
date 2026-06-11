-- AlterTable
ALTER TABLE "LeaderboardEntry" ADD COLUMN     "scorePoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "goals1" INTEGER,
ADD COLUMN     "goals2" INTEGER;
