ALTER TABLE "public"."Game"
ADD COLUMN IF NOT EXISTS "has_forty_yard" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "public"."Game"."has_forty_yard" IS 'When true, first downs and field markings include the midfield 40. When false, first downs are only at the 20s and goal lines.';
