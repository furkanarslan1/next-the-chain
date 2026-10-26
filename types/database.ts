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
      blocked_words: {
        Row: {
          mode: string
          word: string
        }
        Insert: {
          mode?: string
          word: string
        }
        Update: {
          mode?: string
          word?: string
        }
        Relationships: []
      }
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
          weekly_jokers: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          kind: string
          owner_id: string
          title: string
          weekly_jokers?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          title?: string
          weekly_jokers?: number
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
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
          goal_per_week?: number | null
          group_id?: string | null
          id?: string
          kind?: string
          last_day?: string | null
          owner_id: string
          pending_jokers_from?: string | null
          pending_weekly_jokers?: number | null
          streak_started_on?: string | null
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
          goal_per_week?: number | null
          group_id?: string | null
          id?: string
          kind?: string
          last_day?: string | null
          owner_id?: string
          pending_jokers_from?: string | null
          pending_weekly_jokers?: number | null
          streak_started_on?: string | null
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
      league_deleted_stats: {
        Row: {
          done: number
          expected: number
          user_id: string
          week_start: string
        }
        Insert: {
          done?: number
          expected?: number
          user_id: string
          week_start: string
        }
        Update: {
          done?: number
          expected?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_deleted_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          cohort: number
          tier: number
          user_id: string
          week_start: string
        }
        Insert: {
          cohort: number
          tier: number
          user_id: string
          week_start: string
        }
        Update: {
          cohort?: number
          tier?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_results: {
        Row: {
          cohort: number
          outcome: string
          place: number
          score: number | null
          tier: number
          user_id: string
          week_start: string
        }
        Insert: {
          cohort: number
          outcome: string
          place: number
          score?: number | null
          tier: number
          user_id: string
          week_start: string
        }
        Update: {
          cohort?: number
          outcome?: string
          place?: number
          score?: number | null
          tier?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_snapshots: {
        Row: {
          cohort: number
          computed_at: string
          rows: Json
          tier: number
          week_start: string
        }
        Insert: {
          cohort: number
          computed_at?: string
          rows: Json
          tier: number
          week_start: string
        }
        Update: {
          cohort?: number
          computed_at?: string
          rows?: Json
          tier?: number
          week_start?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: number
          kind: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: never
          kind: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: never
          kind?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_days: number
          avatar_url: string | null
          badges_synced_at: string | null
          created_at: string
          discoverable: boolean
          display_name: string | null
          id: string
          last_reminded_on: string | null
          last_risk_reminded_on: string | null
          league_tier: number
          league_visible: boolean
          notify_league: boolean
          notify_social: boolean
          plan: string
          pwa_installed_at: string | null
          rank_seen: number
          reminder_hour: number
          reminders_enabled: boolean
          risk_reminders_enabled: boolean
          share_today: boolean
          timezone: string
          timezone_changed_at: string | null
          total_completed: number
          tour_stage: number
          username: string | null
        }
        Insert: {
          active_days?: number
          avatar_url?: string | null
          badges_synced_at?: string | null
          created_at?: string
          discoverable?: boolean
          display_name?: string | null
          id: string
          last_reminded_on?: string | null
          last_risk_reminded_on?: string | null
          league_tier?: number
          league_visible?: boolean
          notify_league?: boolean
          notify_social?: boolean
          plan?: string
          pwa_installed_at?: string | null
          rank_seen?: number
          reminder_hour?: number
          reminders_enabled?: boolean
          risk_reminders_enabled?: boolean
          share_today?: boolean
          timezone?: string
          timezone_changed_at?: string | null
          total_completed?: number
          tour_stage?: number
          username?: string | null
        }
        Update: {
          active_days?: number
          avatar_url?: string | null
          badges_synced_at?: string | null
          created_at?: string
          discoverable?: boolean
          display_name?: string | null
          id?: string
          last_reminded_on?: string | null
          last_risk_reminded_on?: string | null
          league_tier?: number
          league_visible?: boolean
          notify_league?: boolean
          notify_social?: boolean
          plan?: string
          pwa_installed_at?: string | null
          rank_seen?: number
          reminder_hour?: number
          reminders_enabled?: boolean
          risk_reminders_enabled?: boolean
          share_today?: boolean
          timezone?: string
          timezone_changed_at?: string | null
          total_completed?: number
          tour_stage?: number
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
      rate_limits: {
        Row: {
          action: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: number
          note: string | null
          reason: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          note?: string | null
          reason: string
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: never
          note?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge: string
          earned_at: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          badge: string
          earned_at?: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          badge?: string
          earned_at?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
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
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
      check_rate_limit: {
        Args: { p_action: string; p_max: number; p_window: string }
        Returns: undefined
      }
      claim_notifications: {
        Args: { p_limit?: number }
        Returns: {
          data: Json
          id: number
          kind: string
          user_id: string
        }[]
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
          p_weekly_jokers?: number
        }
        Returns: string
      }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
      friends_leaderboard: {
        Args: { p_from: string }
        Returns: {
          active_days: number
          avatar_url: string
          completed: number
          display_name: string
          user_id: string
          username: string
        }[]
      }
      friends_today: {
        Args: never
        Returns: {
          ft_state: string
          ft_user_id: string
          ft_username: string
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
          member_active_days: number
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
      league_enroll: {
        Args: { p_user: string; p_week: string }
        Returns: undefined
      }
      league_score: {
        Args: { p_asof: string; p_user: string; p_week: string }
        Returns: {
          done: number
          expected: number
          score: number
        }[]
      }
      league_standings: {
        Args: never
        Returns: {
          lg_active_days: number
          lg_demote: number
          lg_done: number
          lg_expected: number
          lg_is_me: boolean
          lg_place: number
          lg_promote: number
          lg_score: number
          lg_size: number
          lg_tier: number
          lg_user_id: string
          lg_username: string
          lg_week_start: string
        }[]
      }
      league_week_start: { Args: { p_ts?: string }; Returns: string }
      leave_group: { Args: { p_group_id: string }; Returns: undefined }
      mark_badges_seen: { Args: never; Returns: undefined }
      mark_pwa_installed: { Args: never; Returns: undefined }
      my_badges: {
        Args: never
        Returns: {
          bd_badge: string
          bd_earned_at: string
          bd_is_new: boolean
        }[]
      }
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
      my_groups_today: {
        Args: never
        Returns: {
          gt_color: string
          gt_done: number
          gt_group_id: string
          gt_title: string
          gt_total: number
        }[]
      }
      my_heatmap: {
        Args: { p_days?: number }
        Returns: {
          hm_day: string
          hm_done: number
          hm_joker: number
        }[]
      }
      my_league_history: {
        Args: never
        Returns: {
          outcome: string
          place: number
          score: number
          tier: number
          week_start: string
        }[]
      }
      normalize_username: { Args: { p_username: string }; Returns: string }
      plan_chain_limit: { Args: { p_plan: string }; Returns: number }
      release_notifications: { Args: { p_ids: number[] }; Returns: undefined }
      report_relapse: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
      report_user: {
        Args: { p_note?: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      reset_tour: { Args: never; Returns: undefined }
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
      search_users_impl: {
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
      set_chain_jokers: {
        Args: { p_chain_id: string; p_value: number }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
      set_rank_seen: { Args: { p_rank: number }; Returns: undefined }
      set_tour_stage: { Args: { p_stage: number }; Returns: undefined }
      settle_chain: {
        Args: { p_chain_id: string }
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
      settle_leagues: { Args: { p_now?: string }; Returns: undefined }
      settle_my_chains: {
        Args: never
        Returns: {
          archived_at: string | null
          best_length: number
          break_count: number
          color: string
          created_at: string
          current_length: number
          goal_per_week: number | null
          group_id: string | null
          id: string
          kind: string
          last_day: string | null
          owner_id: string
          pending_jokers_from: string | null
          pending_weekly_jokers: number | null
          streak_started_on: string | null
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
      share_badge_data: {
        Args: { p_badge: string }
        Returns: {
          sh_earned_at: string
          sh_username: string
        }[]
      }
      share_chain_data: {
        Args: { p_chain_id: string }
        Returns: {
          sh_best: number
          sh_color: string
          sh_kind: string
          sh_length: number
          sh_title: string
          sh_total: number
          sh_username: string
        }[]
      }
      share_profile_data: {
        Args: never
        Returns: {
          sh_active_days: number
          sh_timezone: string
          sh_total: number
          sh_username: string
        }[]
      }
      sync_badges: { Args: { p_user: string }; Returns: undefined }
      user_today: { Args: { p_user_id: string }; Returns: string }
      username_allowed: { Args: { p_username: string }; Returns: boolean }
      users_at_risk: {
        Args: { p_limit?: number; p_now?: string }
        Returns: {
          at_risk_count: number
          local_day: string
          longest_streak: number
          user_id: string
        }[]
      }
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
