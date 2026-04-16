export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      error_events: {
        Row: {
          id: string;
          attempt_id: string;
          step_attempt_id: string | null;
          user_id: string;
          scenario_id: string;
          error_code: string;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          step_attempt_id?: string | null;
          user_id: string;
          scenario_id: string;
          error_code: string;
          detail?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          step_attempt_id?: string | null;
          user_id?: string;
          scenario_id?: string;
          error_code?: string;
          detail?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "error_events_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "scenario_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_events_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scoring_scenarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_events_step_attempt_id_fkey";
            columns: ["step_attempt_id"];
            isOneToOne: false;
            referencedRelation: "scenario_step_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      kc_mastery: {
        Row: {
          user_id: string;
          kc_id: string;
          mastery: number;
          correct_attempts: number;
          incorrect_attempts: number;
          last_updated: string;
        };
        Insert: {
          user_id: string;
          kc_id: string;
          mastery?: number;
          correct_attempts?: number;
          incorrect_attempts?: number;
          last_updated?: string;
        };
        Update: {
          user_id?: string;
          kc_id?: string;
          mastery?: number;
          correct_attempts?: number;
          incorrect_attempts?: number;
          last_updated?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kc_mastery_kc_id_fkey";
            columns: ["kc_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kc_mastery_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_components: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      scenario_attempts: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string;
          expected_total: number;
          submitted_total: number | null;
          is_correct: boolean;
          error_codes: string[];
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          scenario_id: string;
          expected_total: number;
          submitted_total?: number | null;
          is_correct?: boolean;
          error_codes?: string[];
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          scenario_id?: string;
          expected_total?: number;
          submitted_total?: number | null;
          is_correct?: boolean;
          error_codes?: string[];
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scenario_attempts_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scoring_scenarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenario_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      scenario_step_attempts: {
        Row: {
          id: string;
          attempt_id: string;
          step_key: string;
          submitted_value: number | null;
          expected_value: number;
          is_correct: boolean;
          feedback: string | null;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          step_key: string;
          submitted_value?: number | null;
          expected_value: number;
          is_correct: boolean;
          feedback?: string | null;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          step_key?: string;
          submitted_value?: number | null;
          expected_value?: number;
          is_correct?: boolean;
          feedback?: string | null;
          error_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenario_step_attempts_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "scenario_attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      scoring_scenarios: {
        Row: {
          id: string;
          title: string;
          description: string;
          difficulty: number;
          stars: number;
          territories: number;
          resources: number;
          coins: number;
          popularity: number;
          tags: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          difficulty: number;
          stars: number;
          territories: number;
          resources: number;
          coins: number;
          popularity: number;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          difficulty?: number;
          stars?: number;
          territories?: number;
          resources?: number;
          coins?: number;
          popularity?: number;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_scenarios_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      skip_check_attempts: {
        Row: {
          id: string;
          user_id: string;
          total_players: number;
          correct_players: number;
          is_perfect: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_players: number;
          correct_players: number;
          is_perfect: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_players?: number;
          correct_players?: number;
          is_perfect?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "skip_check_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subtype_attempt_events: {
        Row: {
          id: string;
          user_id: string;
          subtype_id: string;
          is_correct: boolean;
          first_try_correct: boolean;
          had_factory: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subtype_id: string;
          is_correct: boolean;
          first_try_correct: boolean;
          had_factory?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subtype_id?: string;
          is_correct?: boolean;
          first_try_correct?: boolean;
          had_factory?: boolean | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subtype_attempt_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_progress: {
        Row: {
          user_id: string;
          subtype_mastery: Json;
          single_player_consecutive_correct: number;
          single_player_mastered: boolean;
          max_multiplayer_unlocked: number;
          speed_challenge_unlocked: boolean;
          tutorial_completed: boolean;
          skip_check_passed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          subtype_mastery?: Json;
          single_player_consecutive_correct?: number;
          single_player_mastered?: boolean;
          max_multiplayer_unlocked?: number;
          speed_challenge_unlocked?: boolean;
          tutorial_completed?: boolean;
          skip_check_passed?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          subtype_mastery?: Json;
          single_player_consecutive_correct?: number;
          single_player_mastered?: boolean;
          max_multiplayer_unlocked?: number;
          speed_challenge_unlocked?: boolean;
          tutorial_completed?: boolean;
          skip_check_passed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
