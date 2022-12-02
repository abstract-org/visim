-- AlterTable
CREATE SEQUENCE "investor_balances_id_seq";
ALTER TABLE "investor_balances" ALTER COLUMN "id" SET DEFAULT nextval('investor_balances_id_seq');
ALTER SEQUENCE "investor_balances_id_seq" OWNED BY "investor_balances"."id";
