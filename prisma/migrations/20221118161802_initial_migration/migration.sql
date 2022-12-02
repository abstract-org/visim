-- CreateTable
CREATE TABLE "investor" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_balances" (
    "id" INTEGER NOT NULL,
    "investor_id" INTEGER NOT NULL,
    "quest_id" INTEGER NOT NULL,
    "balance" DECIMAL NOT NULL,
    "day" INTEGER,

    CONSTRAINT "investor_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_navs" (
    "id" BIGSERIAL NOT NULL,
    "investor_id" BIGINT,
    "day" INTEGER,
    "usdc_nav" DOUBLE PRECISION,
    "token_nav" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_navs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_quests" (
    "id" INTEGER NOT NULL,
    "investor_id" INTEGER NOT NULL,
    "quest_id" INTEGER NOT NULL,

    CONSTRAINT "investor_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log" (
    "id" SERIAL NOT NULL,
    "pool_id" INTEGER,
    "investor_id" INTEGER NOT NULL,
    "swap_id" INTEGER,
    "action" VARCHAR(255) NOT NULL,
    "day" INTEGER,

    CONSTRAINT "log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "token0" VARCHAR(255) NOT NULL,
    "token1" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_data" (
    "id" SERIAL NOT NULL,
    "swap_id" INTEGER,
    "pool_id" INTEGER NOT NULL,
    "current_liquidity" DOUBLE PRECISION NOT NULL,
    "current_price" DOUBLE PRECISION NOT NULL,
    "current_price_point_lg2" DOUBLE PRECISION,
    "current_left_lg2" DOUBLE PRECISION,
    "current_right_lg2" DOUBLE PRECISION,
    "token0_price" DOUBLE PRECISION NOT NULL,
    "volume_token0" DOUBLE PRECISION NOT NULL,
    "token1_price" DOUBLE PRECISION NOT NULL,
    "volume_token1" DOUBLE PRECISION NOT NULL,
    "tvl" DOUBLE PRECISION NOT NULL,
    "mcap" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "pool_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position" (
    "id" SERIAL NOT NULL,
    "pool_id" INTEGER NOT NULL,
    "liquidity" DOUBLE PRECISION NOT NULL,
    "left_point" DOUBLE PRECISION,
    "right_point" DOUBLE PRECISION,
    "price_point" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_owners" (
    "id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,
    "owner_type" VARCHAR(255) NOT NULL,

    CONSTRAINT "position_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_pools" (
    "id" INTEGER NOT NULL,
    "quest_id" INTEGER NOT NULL,
    "pool_id" INTEGER NOT NULL,

    CONSTRAINT "quest_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_data" (
    "id" INTEGER NOT NULL,
    "scenario_id" INTEGER NOT NULL,
    "module_type" VARCHAR(255) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "scenario_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot" (
    "id" SERIAL NOT NULL,
    "seed" VARCHAR(255) NOT NULL,
    "scenario_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_data" (
    "id" SERIAL NOT NULL,
    "snapshot_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(255) NOT NULL,
    "entity_id" INTEGER NOT NULL,

    CONSTRAINT "snapshot_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_investor" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "snapshot_id" INTEGER,
    "entity_id" INTEGER,

    CONSTRAINT "snapshot_investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_pool" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "snapshot_id" INTEGER,
    "entity_id" INTEGER,

    CONSTRAINT "snapshot_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_quest" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "snapshot_id" INTEGER,
    "entity_id" INTEGER,

    CONSTRAINT "snapshot_quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap" (
    "id" SERIAL NOT NULL,
    "pool_id" INTEGER NOT NULL,
    "investor_id" INTEGER NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "amount_in" DOUBLE PRECISION NOT NULL,
    "amount_out" DOUBLE PRECISION NOT NULL,
    "day" INTEGER NOT NULL,
    "block" INTEGER NOT NULL,
    "path" VARCHAR(255) NOT NULL,

    CONSTRAINT "swap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investor_quests_investor_id_index" ON "investor_quests"("investor_id");

-- CreateIndex
CREATE INDEX "investor_quests_quest_id_index" ON "investor_quests"("quest_id");

-- CreateIndex
CREATE INDEX "log_investor_id_index" ON "log"("investor_id");

-- CreateIndex
CREATE INDEX "log_pool_id_index" ON "log"("pool_id");

-- CreateIndex
CREATE INDEX "log_swap_id_index" ON "log"("swap_id");

-- CreateIndex
CREATE INDEX "pool_data_pool_id_index" ON "pool_data"("pool_id");

-- CreateIndex
CREATE INDEX "position_owner_id_index" ON "position"("liquidity");

-- CreateIndex
CREATE INDEX "position_pool_id_index" ON "position"("pool_id");

-- CreateIndex
CREATE INDEX "position_owners_owner_id_index" ON "position_owners"("owner_id");

-- CreateIndex
CREATE INDEX "quest_pools_pool_id_index" ON "quest_pools"("pool_id");

-- CreateIndex
CREATE INDEX "quest_pools_quest_id_index" ON "quest_pools"("quest_id");

-- CreateIndex
CREATE INDEX "scenario_data_scenario_id_index" ON "scenario_data"("scenario_id");

-- CreateIndex
CREATE INDEX "snapshot_scenario_id_index" ON "snapshot"("scenario_id");

-- CreateIndex
CREATE INDEX "swap_investor_id_index" ON "swap"("investor_id");

-- CreateIndex
CREATE INDEX "swap_pool_id_index" ON "swap"("pool_id");

-- AddForeignKey
ALTER TABLE "investor_balances" ADD CONSTRAINT "investor_balances_investor_id_foreign" FOREIGN KEY ("investor_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "investor_balances" ADD CONSTRAINT "investor_balances_quest_id_foreign" FOREIGN KEY ("quest_id") REFERENCES "quest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "investor_quests" ADD CONSTRAINT "investor_quests_investor_id_foreign" FOREIGN KEY ("investor_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "investor_quests" ADD CONSTRAINT "investor_quests_quest_id_foreign" FOREIGN KEY ("quest_id") REFERENCES "quest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "log" ADD CONSTRAINT "log_investor_id_foreign" FOREIGN KEY ("investor_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "log" ADD CONSTRAINT "log_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "log" ADD CONSTRAINT "log_swap_id_fkey" FOREIGN KEY ("swap_id") REFERENCES "swap"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pool_data" ADD CONSTRAINT "pool_data_pool_id_foreign" FOREIGN KEY ("pool_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pool_data" ADD CONSTRAINT "pool_data_swap_id_fkey" FOREIGN KEY ("swap_id") REFERENCES "swap"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_pool_id_foreign" FOREIGN KEY ("pool_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_owners" ADD CONSTRAINT "position_owners_investor_owner_id_foreign" FOREIGN KEY ("owner_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_owners" ADD CONSTRAINT "position_owners_position_id_foreign" FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_owners" ADD CONSTRAINT "position_owners_quest_owner_id_foreign" FOREIGN KEY ("owner_id") REFERENCES "quest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quest" ADD CONSTRAINT "quest_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quest_pools" ADD CONSTRAINT "quest_pools_pool_id_foreign" FOREIGN KEY ("pool_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quest_pools" ADD CONSTRAINT "quest_pools_quest_id_foreign" FOREIGN KEY ("quest_id") REFERENCES "quest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scenario_data" ADD CONSTRAINT "scenario_data_scenario_id_foreign" FOREIGN KEY ("scenario_id") REFERENCES "scenario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_scenario_id_foreign" FOREIGN KEY ("scenario_id") REFERENCES "scenario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_data" ADD CONSTRAINT "snapshot_data_investor_entity_id_foreign" FOREIGN KEY ("entity_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_data" ADD CONSTRAINT "snapshot_data_pool_entity_id_foreign" FOREIGN KEY ("entity_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_data" ADD CONSTRAINT "snapshot_data_quest_entity_id_foreign" FOREIGN KEY ("entity_id") REFERENCES "quest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_data" ADD CONSTRAINT "snapshot_data_snapshot_id_foreign" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_investor" ADD CONSTRAINT "snapshot_investor_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_investor" ADD CONSTRAINT "snapshot_investor_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_pool" ADD CONSTRAINT "snapshot_pool_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_pool" ADD CONSTRAINT "snapshot_pool_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_quest" ADD CONSTRAINT "snapshot_quest_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "quest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snapshot_quest" ADD CONSTRAINT "snapshot_quest_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "swap" ADD CONSTRAINT "swap_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "swap" ADD CONSTRAINT "swap_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
