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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      diaries: {
        Row: {
          content: string
          created_at: string | null
          emoji: string | null
          id: string
          length: string | null
          participants: Json | null
          perspective: string | null
          photo_id: string | null
          title: string | null
          tone: string | null
          user_id: string
          weather: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          emoji?: string | null
          id?: string
          length?: string | null
          participants?: Json | null
          perspective?: string | null
          photo_id?: string | null
          title?: string | null
          tone?: string | null
          user_id: string
          weather?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          emoji?: string | null
          id?: string
          length?: string | null
          participants?: Json | null
          perspective?: string | null
          photo_id?: string | null
          title?: string | null
          tone?: string | null
          user_id?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diaries_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_comments: {
        Row: {
          content: string
          created_at: string
          diary_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          diary_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          diary_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_comments_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "diaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      diary_likes: {
        Row: {
          created_at: string
          diary_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diary_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diary_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_likes_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "diaries"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_notebooks: {
        Row: {
          created_at: string | null
          diary_id: string
          id: string
          notebook_id: string
        }
        Insert: {
          created_at?: string | null
          diary_id: string
          id?: string
          notebook_id: string
        }
        Update: {
          created_at?: string | null
          diary_id?: string
          id?: string
          notebook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_notebooks_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "diaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_notebooks_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notebook_members: {
        Row: {
          created_at: string | null
          id: string
          notebook_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notebook_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notebook_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_members_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
          visibility: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          diary_id: string | null
          display_order: number | null
          id: string
          metadata: Json | null
          photo_url: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          diary_id?: string | null
          display_order?: number | null
          id?: string
          metadata?: Json | null
          photo_url: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          diary_id?: string | null
          display_order?: number | null
          id?: string
          metadata?: Json | null
          photo_url?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "diaries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          birthday: string | null
          blood_type: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: string
          location: string | null
          mbti: string | null
          name: string | null
          profile_photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          birthday?: string | null
          blood_type?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          mbti?: string | null
          name?: string | null
          profile_photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          birthday?: string | null
          blood_type?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          mbti?: string | null
          name?: string | null
          profile_photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_diary_public: { Args: { _diary_id: string }; Returns: boolean }
      is_notebook_owner: {
        Args: { _notebook_id: string; _user_id: string }
        Returns: boolean
      }
      sync_user_email: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
