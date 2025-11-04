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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      booking_attachments: {
        Row: {
          booking_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_attachments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          alamat: string | null
          booking_id: string | null
          catatan: string | null
          catatan_internal: string | null
          catatan_reschedule: string | null
          cluster: string | null
          created_at: string
          foto: string | null
          id: string
          jenis_layanan: string | null
          jumlah_unit: number | null
          kode_referral: string | null
          kode_teknisi: string | null
          nama: string | null
          no_hp: string | null
          status: string | null
          tanggal_kunjungan: string | null
          tanggal_selesai: string | null
          teknisi: string | null
          timestamp: string | null
          updated_at: string
          waktu_kunjungan: string | null
        }
        Insert: {
          alamat?: string | null
          booking_id?: string | null
          catatan?: string | null
          catatan_internal?: string | null
          catatan_reschedule?: string | null
          cluster?: string | null
          created_at?: string
          foto?: string | null
          id?: string
          jenis_layanan?: string | null
          jumlah_unit?: number | null
          kode_referral?: string | null
          kode_teknisi?: string | null
          nama?: string | null
          no_hp?: string | null
          status?: string | null
          tanggal_kunjungan?: string | null
          tanggal_selesai?: string | null
          teknisi?: string | null
          timestamp?: string | null
          updated_at?: string
          waktu_kunjungan?: string | null
        }
        Update: {
          alamat?: string | null
          booking_id?: string | null
          catatan?: string | null
          catatan_internal?: string | null
          catatan_reschedule?: string | null
          cluster?: string | null
          created_at?: string
          foto?: string | null
          id?: string
          jenis_layanan?: string | null
          jumlah_unit?: number | null
          kode_referral?: string | null
          kode_teknisi?: string | null
          nama?: string | null
          no_hp?: string | null
          status?: string | null
          tanggal_kunjungan?: string | null
          tanggal_selesai?: string | null
          teknisi?: string | null
          timestamp?: string | null
          updated_at?: string
          waktu_kunjungan?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          cluster: string | null
          created_at: string
          id: string
          name: string
          phone_number: string
          updated_at: string
        }
        Insert: {
          address: string
          cluster?: string | null
          created_at?: string
          id?: string
          name: string
          phone_number: string
          updated_at?: string
        }
        Update: {
          address?: string
          cluster?: string | null
          created_at?: string
          id?: string
          name?: string
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_reports: {
        Row: {
          id: string
          nama_pelanggan: string
          alamat_pelanggan: string | null
          no_wa_pelanggan: string
          no_unit: string | null
          merk: string | null
          spek_unit: string | null
          foto_url: string | null
          tanggal_dikerjakan: string | null
          jenis_pekerjaan: string
          teknisi: string
          keterangan: string | null
          booking_id: string | null
          status: string | null
          approved_by: string | null
          approved_at: string | null
          approval_notes: string | null
          rejection_reason: string | null
          internal_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nama_pelanggan: string
          alamat_pelanggan?: string | null
          no_wa_pelanggan: string
          no_unit?: string | null
          merk?: string | null
          spek_unit?: string | null
          foto_url?: string | null
          tanggal_dikerjakan?: string | null
          jenis_pekerjaan: string
          teknisi: string
          keterangan?: string | null
          booking_id?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_notes?: string | null
          rejection_reason?: string | null
          internal_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nama_pelanggan?: string
          alamat_pelanggan?: string | null
          no_wa_pelanggan?: string
          no_unit?: string | null
          merk?: string | null
          spek_unit?: string | null
          foto_url?: string | null
          tanggal_dikerjakan?: string | null
          jenis_pekerjaan?: string
          teknisi?: string
          keterangan?: string | null
          booking_id?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_notes?: string | null
          rejection_reason?: string | null
          internal_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      technician_schedules: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          is_available: boolean | null
          notes: string | null
          start_time: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_time: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_time?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_schedules_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          partner_id: string
          nama_lengkap: string
          nomor_whatsapp: string
          email: string | null
          alamat: string | null
          tanggal_bergabung: string
          status: string | null
          total_poin: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          partner_id: string
          nama_lengkap: string
          nomor_whatsapp: string
          email?: string | null
          alamat?: string | null
          tanggal_bergabung?: string
          status?: string | null
          total_poin?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          partner_id?: string
          nama_lengkap?: string
          nomor_whatsapp?: string
          email?: string | null
          alamat?: string | null
          tanggal_bergabung?: string
          status?: string | null
          total_poin?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
