-- AlterTable
ALTER TABLE "League" ADD COLUMN     "buyInAmount" DECIMAL(10,2),
ADD COLUMN     "buyInCurrency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN     "isPrizePool" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LeagueMember" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT true;
