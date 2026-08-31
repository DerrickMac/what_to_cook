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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cook_queue: {
        Row: {
          added_at: string
          household_id: string
          id: string
          recipe_id: string
        }
        Insert: {
          added_at?: string
          household_id: string
          id?: string
          recipe_id: string
        }
        Update: {
          added_at?: string
          household_id?: string
          id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_queue_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_queue_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list: {
        Row: {
          created_at: string
          from_recipe_id: string | null
          household_id: string
          id: string
          ingredient_id: string | null
          is_checked: boolean
          item_name: string
          quantity: string | null
        }
        Insert: {
          created_at?: string
          from_recipe_id?: string | null
          household_id: string
          id?: string
          ingredient_id?: string | null
          is_checked?: boolean
          item_name: string
          quantity?: string | null
        }
        Update: {
          created_at?: string
          from_recipe_id?: string | null
          household_id?: string
          id?: string
          ingredient_id?: string | null
          is_checked?: boolean
          item_name?: string
          quantity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_from_recipe_id_fkey"
            columns: ["from_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string | null
          created_at: string
          default_unit: string | null
          id: string
          image_url: string | null
          name: string
          preferred_brand: string | null
          tracking_mode: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_unit?: string | null
          id?: string
          image_url?: string | null
          name: string
          preferred_brand?: string | null
          tracking_mode?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_unit?: string | null
          id?: string
          image_url?: string | null
          name?: string
          preferred_brand?: string | null
          tracking_mode?: string
        }
        Relationships: []
      }
      inventory_log: {
        Row: {
          change_type: string
          created_at: string
          household_id: string
          id: string
          ingredient_id: string
          quantity_delta: number | null
          recipe_id: string | null
          source: string
          status_after: string | null
          status_before: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          household_id: string
          id?: string
          ingredient_id: string
          quantity_delta?: number | null
          recipe_id?: string | null
          source: string
          status_after?: string | null
          status_before?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          household_id?: string
          id?: string
          ingredient_id?: string
          quantity_delta?: number | null
          recipe_id?: string | null
          source?: string
          status_after?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_sequence_recipes: {
        Row: {
          id: string
          position: number
          recipe_id: string
          sequence_id: string
        }
        Insert: {
          id?: string
          position?: number
          recipe_id: string
          sequence_id: string
        }
        Update: {
          id?: string
          position?: number
          recipe_id?: string
          sequence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_sequence_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_sequence_recipes_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "meal_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_sequences: {
        Row: {
          created_at: string
          extras: string[]
          household_id: string
          id: string
          notes: string | null
          shared: string[]
          title: string
        }
        Insert: {
          created_at?: string
          extras?: string[]
          household_id: string
          id?: string
          notes?: string | null
          shared?: string[]
          title?: string
        }
        Update: {
          created_at?: string
          extras?: string[]
          household_id?: string
          id?: string
          notes?: string | null
          shared?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_sequences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_aisles: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          expires_at: string | null
          household_id: string
          id: string
          ingredient_id: string
          quantity: number | null
          status: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          expires_at?: string | null
          household_id: string
          id?: string
          ingredient_id: string
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          expires_at?: string | null
          household_id?: string
          id?: string
          ingredient_id?: string
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fridge_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fridge_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          component_recipe_id: string | null
          group_name: string | null
          id: string
          ingredient_id: string | null
          name_text: string | null
          notes: string | null
          quantity_text: string | null
          quantity_value: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          component_recipe_id?: string | null
          group_name?: string | null
          id?: string
          ingredient_id?: string | null
          name_text?: string | null
          notes?: string | null
          quantity_text?: string | null
          quantity_value?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          component_recipe_id?: string | null
          group_name?: string | null
          id?: string
          ingredient_id?: string | null
          name_text?: string | null
          notes?: string | null
          quantity_text?: string | null
          quantity_value?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_component_recipe_id_fkey"
            columns: ["component_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_step_timers: {
        Row: {
          created_at: string
          id: string
          label: string
          minutes: number
          position: number
          recipe_id: string
          source: string
          step_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          minutes: number
          position?: number
          recipe_id: string
          source?: string
          step_index: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          minutes?: number
          position?: number
          recipe_id?: string
          source?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_step_timers_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          author: string | null
          category: string | null
          created_at: string
          household_id: string
          hue_a: string | null
          hue_b: string | null
          id: string
          instructions: string | null
          is_favorite: boolean
          is_tried: boolean
          minutes: number
          notes: string | null
          serves: number | null
          servings: string | null
          source_url: string | null
          subcategory: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string
          household_id: string
          hue_a?: string | null
          hue_b?: string | null
          id?: string
          instructions?: string | null
          is_favorite?: boolean
          is_tried?: boolean
          minutes?: number
          notes?: string | null
          serves?: number | null
          servings?: string | null
          source_url?: string | null
          subcategory?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string
          household_id?: string
          hue_a?: string | null
          hue_b?: string | null
          id?: string
          instructions?: string | null
          is_favorite?: boolean
          is_tried?: boolean
          minutes?: number
          notes?: string | null
          serves?: number | null
          servings?: string | null
          source_url?: string | null
          subcategory?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: { Args: { household_name: string }; Returns: string }
      delete_household_tag: {
        Args: { target_household_id: string; target_tag: string }
        Returns: undefined
      }
      get_household_tags: {
        Args: { target_household_id: string }
        Returns: {
          recipe_count: number
          tag: string
        }[]
      }
      is_household_member: {
        Args: { target_household_id: string }
        Returns: boolean
      }
      join_household: { Args: { invite_code_input: string }; Returns: string }
      rename_household_tag: {
        Args: { new_tag: string; old_tag: string; target_household_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
