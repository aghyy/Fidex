-- Create enum type for theme preference
DO $$ BEGIN
  CREATE TYPE "ThemePreference" AS ENUM ('LIGHT','DARK','SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add column to User with default
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM';


