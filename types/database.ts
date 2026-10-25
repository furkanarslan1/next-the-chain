export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chain_history: {
        Row: {
          chain_id: string
          done_mask: number
          joker_mask: number
          month: string
        }
        Insert: {
          chain_id: string
          done_mask?: number
          joker_mask?: number
          month: string
        }
        Update: {
          chain_id?: string
          done_mask?: number
          joker_mask?: number
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_history_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
        ]
      }
      chains: {
        Row: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          title: string
          total_completed: number
          visibility: string
          weekly_jokers: number
        }
        Insert: {
          archived_at?: string | null
          best_length?: number
          break_count?: number
          color?: string
          created_at?: string
          current_length?: number
          id?: string
          kind?: string
          last_day?: string | null
          owner_id: string
          title: string
          total_completed?: number
          visibility?: string
          weekly_jokers?: number
        }
        Update: {
          archived_at?: string | null
          best_length?: number
          break_count?: number
          color?: string
          created_at?: string
          current_length?: number
          id?: string
          kind?: string
          last_day?: string | null
          owner_id?: string
          title?: string
          total_completed?: number
          visibility?: string
          weekly_jokers?: number
        }
        Relationships: [
          {
            foreignKeyName: "chains_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          chain_id: string
          day: string
          is_joker: boolean
          user_id: string
        }
        Insert: {
          chain_id: string
          day: string
          is_joker?: boolean
          user_id: string
        }
        Update: {
          chain_id?: string
          day?: string
          is_joker?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: number
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: never
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: never
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          plan: string
          timezone: string
          total_completed: number
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          plan?: string
          timezone?: string
          total_completed?: number
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan?: string
          timezone?: string
          total_completed?: number
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      check_in: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          title: string
          total_completed: number
          visibility: string
          weekly_jokers: number
        }
        SetofOptions: {
          from: "*"
          to: "chains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compact_chain: {
        Args: { p_before: string; p_chain_id: string }
        Returns: undefined
      }
      friends_leaderboard: {
        Args: { p_from: string }
        Returns: {
          avatar_url: string
          completed: number
          display_name: string
          user_id: string
          username: string
        }[]
      }
      plan_chain_limit: { Args: { p_plan: string }; Returns: number }
      report_relapse: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          title: string
          total_completed: number
          visibility: string
          weekly_jokers: number
        }
        SetofOptions: {
          from: "*"
          to: "chains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_chain: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          title: string
          total_completed: number
          visibility: string
          weekly_jokers: number
        }
        SetofOptions: {
          from: "*"
          to: "chains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_my_chains: {
        Args: never
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          title: string
          total_completed: number
          visibility: string
          weekly_jokers: number
        }[]
        SetofOptions: {
          from: "*"
          to: "chains"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      user_today: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
