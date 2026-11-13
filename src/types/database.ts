import type { DesignConfig } from '@/types/design'

export interface Database {
  public: {
    Tables: {
      wishes: {
        Row: {
          id: string
          guest_id: string | null
          guest_name: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          guest_id?: string | null
          guest_name?: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          guest_id?: string | null
          guest_name?: string
          message?: string
          created_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          id: string
          full_name: string
          status: number
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          status?: number
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          status?: number
          updated_at?: string
        }
        Relationships: []
      }
      invitation_config: {
        Row: {
          id: string
          config: DesignConfig
          updated_at: string
        }
        Insert: {
          id?: string
          config?: DesignConfig
          updated_at?: string
        }
        Update: {
          id?: string
          config?: DesignConfig
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      submit_wish: {
        Args: { p_guest_id: string | null; p_guest_name: string; p_message: string }
        Returns: undefined
      }
      confirm_guest_attendance: {
        Args: { guest_id: string }
        Returns: undefined
      }
      get_guest_public: {
        Args: { guest_id: string }
        Returns: {
          id: string
          full_name: string
          status: number
          updated_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
