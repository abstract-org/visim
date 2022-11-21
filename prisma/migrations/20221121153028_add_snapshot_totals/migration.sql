-- CreateTable
CREATE TABLE "snapshot_totals" (
    "id" BIGSERIAL NOT NULL,
    "snapshot_id" INTEGER NOT NULL,
    "quests" INTEGER NOT NULL,
    "cross_pools" INTEGER NOT NULL,
    "investors" INTEGER NOT NULL,
    "tvl" INTEGER NOT NULL,
    "mcap" INTEGER NOT NULL,
    "usdc" INTEGER NOT NULL,

    CONSTRAINT "snapshot_totals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "snapshot_totals" ADD CONSTRAINT "snapshot_totals_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
