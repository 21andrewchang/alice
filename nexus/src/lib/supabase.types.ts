export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      node_masteries: {
        Row: {
          id: number
          user_id: string
          node_id: number
          level: number
          progress: number
          last_interaction: string
          completed_sections: string[]
        }
        Insert: {
          id?: number
          user_id: string
          node_id: number
          level: number
          progress: number
          last_interaction: string
          completed_sections?: string[]
        }
        Update: {
          id?: number
          user_id?: string
          node_id?: number
          level?: number
          progress?: number
          last_interaction?: string
          completed_sections?: string[]
        }
      }
      domain_progress: {
        Row: {
          id: number
          user_id: string
          domain: string
          mastery_percentage: number
          completed_nodes: number
          total_nodes: number
        }
        Insert: {
          id?: number
          user_id: string
          domain: string
          mastery_percentage: number
          completed_nodes: number
          total_nodes: number
        }
        Update: {
          id?: number
          user_id?: string
          domain?: string
          mastery_percentage?: number
          completed_nodes?: number
          total_nodes?: number
        }
      }
      achievements: {
        Row: {
          id: number
          user_id: string
          achievement_type: string
          achievement_id: string
          earned_at: string
          metadata: Json
        }
        Insert: {
          id?: number
          user_id: string
          achievement_type: string
          achievement_id: string
          earned_at?: string
          metadata?: Json
        }
        Update: {
          id?: number
          user_id?: string
          achievement_type?: string
          achievement_id?: string
          earned_at?: string
          metadata?: Json
        }
      }
      user_stats: {
        Row: {
          user_id: string
          learning_streak: number
          last_active_date: string
          total_score: number
        }
        Insert: {
          user_id: string
          learning_streak?: number
          last_active_date?: string
          total_score?: number
        }
        Update: {
          user_id?: string
          learning_streak?: number
          last_active_date?: string
          total_score?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 