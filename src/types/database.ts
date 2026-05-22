/**
 * Database types.
 *
 * Hand-written to match supabase/migrations/. Once your project is linked you
 * can regenerate from the live schema with: npm run supabase:types
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WordState = 'unknown' | 'learning' | 'known' | 'ignored'
export type CardType = 'sentence' | 'word' | 'cloze'

export type Profile = {
  id: string
  display_name: string | null
  daily_review_target: number
  created_at: string
  updated_at: string
}

export type Text = {
  id: string
  user_id: string
  title: string
  content: string
  source: string
  language: string
  word_count: number
  last_position: number
  created_at: string
  updated_at: string
}

export type Vocabulary = {
  id: string
  user_id: string
  lemma: string
  surface: string | null
  state: WordState
  root: string | null
  definition: string | null
  translation: string | null
  pos: string | null
  plural: string | null
  synonyms: Json
  antonyms: Json
  senses: Json
  morphology: Json | null
  encounter_count: number
  first_seen_at: string
  last_seen_at: string
}

export type Card = {
  id: string
  user_id: string
  vocabulary_id: string | null
  text_id: string | null
  type: CardType
  front: string
  back: string
  sentence_context: string | null
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
  last_reviewed_at: string | null
  suspended: boolean
  created_at: string
}

export type Review = {
  id: string
  card_id: string
  user_id: string
  rating: number
  ease_before: number | null
  ease_after: number | null
  interval_after: number | null
  reviewed_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          display_name?: string | null
          daily_review_target?: number
        }
        Update: {
          display_name?: string | null
          daily_review_target?: number
        }
        Relationships: []
      }
      texts: {
        Row: Text
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          source?: string
          language?: string
          word_count?: number
          last_position?: number
        }
        Update: {
          title?: string
          content?: string
          source?: string
          language?: string
          word_count?: number
          last_position?: number
        }
        Relationships: []
      }
      vocabulary: {
        Row: Vocabulary
        Insert: {
          id?: string
          user_id: string
          lemma: string
          surface?: string | null
          state?: WordState
          root?: string | null
          definition?: string | null
          translation?: string | null
          pos?: string | null
          morphology?: Json | null
          encounter_count?: number
        }
        Update: {
          surface?: string | null
          state?: WordState
          root?: string | null
          definition?: string | null
          translation?: string | null
          pos?: string | null
          plural?: string | null
          synonyms?: Json
          antonyms?: Json
          senses?: Json
          morphology?: Json | null
          encounter_count?: number
          last_seen_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: Card
        Insert: {
          id?: string
          user_id: string
          vocabulary_id?: string | null
          text_id?: string | null
          type?: CardType
          front: string
          back: string
          sentence_context?: string | null
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          next_review_at?: string
          suspended?: boolean
        }
        Update: {
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          next_review_at?: string
          last_reviewed_at?: string | null
          suspended?: boolean
          front?: string
          back?: string
        }
        Relationships: []
      }
      reviews: {
        Row: Review
        Insert: {
          id?: string
          card_id: string
          user_id: string
          rating: number
          ease_before?: number | null
          ease_after?: number | null
          interval_after?: number | null
          reviewed_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      word_state: WordState
      card_type: CardType
    }
    CompositeTypes: Record<string, never>
  }
}
