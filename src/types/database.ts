/**
 * Auto-generated Supabase database types.
 *
 * In Step 2 we'll generate this file from the live schema:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * For now it's a permissive stub so the app compiles before the schema exists.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
