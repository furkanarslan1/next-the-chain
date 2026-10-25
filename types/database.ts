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
      chain_group_members: {
        Row: {
          chain_id: string | null
          created_at: string
          group_id: string
          status: string
          user_id: string
        }
        Insert: {
          chain_id?: string | null
          created_at?: string
          group_id: string
          status?: string
          user_id: string
        }
        Update: {
          chain_id?: string | null
          created_at?: string
          group_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_group_members_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chain_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          kind: string
          owner_id: string
          title: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          kind: string
          owner_id: string
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          group_id: string | null
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
          group_id?: string | null
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
          group_id?: string | null
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
            foreignKeyName: "chains_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chain_groups"
            referencedColumns: ["id"]
          },
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
          discoverable: boolean
          display_name: string | null
          id: string
          last_reminded_on: string | null
          plan: string
          reminder_hour: number
          reminders_enabled: boolean
          timezone: string
          total_completed: number
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discoverable?: boolean
          display_name?: string | null
          id: string
          last_reminded_on?: string | null
          plan?: string
          reminder_hour?: number
          reminders_enabled?: boolean
          timezone?: string
          total_completed?: number
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discoverable?: boolean
          display_name?: string | null
          id?: string
          last_reminded_on?: string | null
          plan?: string
          reminder_hour?: number
          reminders_enabled?: boolean
          timezone?: string
          total_completed?: number
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: number
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: never
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: never
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      cancel_group_invite: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      check_in: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          group_id: string | null
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
      create_chain_group: {
        Args: {
          p_color: string
          p_friend_ids?: string[]
          p_kind: string
          p_title: string
        }
        Returns: string
      }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
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
      group_friend_ids: {
        Args: { p_ids: string[]; p_me: string }
        Returns: string[]
      }
      group_invites: {
        Args: never
        Returns: {
          color: string
          group_id: string
          kind: string
          member_count: number
          owner_username: string
          title: string
        }[]
      }
      group_pending_invites: {
        Args: { p_group_id: string }
        Returns: {
          member_id: string
          member_username: string
        }[]
      }
      group_standings: {
        Args: { p_group_id: string }
        Returns: {
          best_chain_length: number
          chain_length: number
          member_display_name: string
          member_id: string
          member_username: string
          state: string
        }[]
      }
      invite_to_group: {
        Args: { p_friend_ids: string[]; p_group_id: string }
        Returns: undefined
      }
      leave_group: { Args: { p_group_id: string }; Returns: undefined }
      my_groups: {
        Args: never
        Returns: {
          chain_id: string
          color: string
          group_id: string
          is_owner: boolean
          kind: string
          member_count: number
          title: string
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
          group_id: string | null
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
      respond_group_invite: {
        Args: { p_accept: boolean; p_group_id: string }
        Returns: undefined
      }
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: undefined
      }
      search_users: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          relation: string
          username: string
        }[]
      }
      send_friend_request: { Args: { p_addressee: string }; Returns: string }
      settle_chain: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          group_id: string | null
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
      settle_chain_for: {
        Args: { p_chain_id: string; p_user: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          group_id: string | null
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
          group_id: string | null
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
      users_to_remind: {
        Args: { p_limit?: number; p_now?: string }
        Returns: {
          local_day: string
          longest_streak: number
          pending_count: number
          user_id: string
        }[]
      }
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
