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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          boleto_url: string | null
          categoria: string | null
          centro_custo: string | null
          created_at: string
          dia_vencimento: number | null
          empresa_id: string
          fornecedor_id: string
          id: string
          nota_fiscal_url: string | null
          num_parcelas: number
          numero_documento: string | null
          observacao: string | null
          user_id: string
          valor_total: number
        }
        Insert: {
          boleto_url?: string | null
          categoria?: string | null
          centro_custo?: string | null
          created_at?: string
          dia_vencimento?: number | null
          empresa_id: string
          fornecedor_id: string
          id?: string
          nota_fiscal_url?: string | null
          num_parcelas?: number
          numero_documento?: string | null
          observacao?: string | null
          user_id: string
          valor_total?: number
        }
        Update: {
          boleto_url?: string | null
          categoria?: string | null
          centro_custo?: string | null
          created_at?: string
          dia_vencimento?: number | null
          empresa_id?: string
          fornecedor_id?: string
          id?: string
          nota_fiscal_url?: string | null
          num_parcelas?: number
          numero_documento?: string | null
          observacao?: string | null
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data: string
          descricao: string
          id?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          tipo: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      fechamentos: {
        Row: {
          comissao_hippocampus: number
          comissao_japa: number
          comissao_trattoria: number
          created_at: string
          data: string
          hippocampus_taxa: number
          hippocampus_total: number
          hippocampus_valor_itens: number
          id: string
          japa_taxa: number
          japa_total: number
          japa_valor_itens: number
          pagamentos_hippocampus: Json | null
          pagamentos_japa: Json | null
          pagamentos_trattoria: Json | null
          total_geral: number
          trattoria_taxa: number
          trattoria_total: number
          trattoria_valor_itens: number
          user_id: string
        }
        Insert: {
          comissao_hippocampus?: number
          comissao_japa?: number
          comissao_trattoria?: number
          created_at?: string
          data: string
          hippocampus_taxa?: number
          hippocampus_total?: number
          hippocampus_valor_itens?: number
          id?: string
          japa_taxa?: number
          japa_total?: number
          japa_valor_itens?: number
          pagamentos_hippocampus?: Json | null
          pagamentos_japa?: Json | null
          pagamentos_trattoria?: Json | null
          total_geral?: number
          trattoria_taxa?: number
          trattoria_total?: number
          trattoria_valor_itens?: number
          user_id: string
        }
        Update: {
          comissao_hippocampus?: number
          comissao_japa?: number
          comissao_trattoria?: number
          created_at?: string
          data?: string
          hippocampus_taxa?: number
          hippocampus_total?: number
          hippocampus_valor_itens?: number
          id?: string
          japa_taxa?: number
          japa_total?: number
          japa_valor_itens?: number
          pagamentos_hippocampus?: Json | null
          pagamentos_japa?: Json | null
          pagamentos_trattoria?: Json | null
          total_geral?: number
          trattoria_taxa?: number
          trattoria_total?: number
          trattoria_valor_itens?: number
          user_id?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          cnpj_cpf: string | null
          conta: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          cnpj_cpf?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          cnpj_cpf?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          ativo: boolean
          base_salary: number
          birth_date: string | null
          created_at: string
          frente: Database["public"]["Enums"]["frente_tipo"]
          id: string
          nome: string
          setor: Database["public"]["Enums"]["setor_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          base_salary?: number
          birth_date?: string | null
          created_at?: string
          frente?: Database["public"]["Enums"]["frente_tipo"]
          id?: string
          nome: string
          setor: Database["public"]["Enums"]["setor_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          base_salary?: number
          birth_date?: string | null
          created_at?: string
          frente?: Database["public"]["Enums"]["frente_tipo"]
          id?: string
          nome?: string
          setor?: Database["public"]["Enums"]["setor_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_read: boolean
          group_id: string
          id: string
          module: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          group_id: string
          id?: string
          module: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          group_id?: string
          id?: string
          module?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_funcionarios: {
        Row: {
          created_at: string
          data: string
          fechamento_id: string | null
          funcionario_id: string
          id: string
          pago: boolean
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          fechamento_id?: string | null
          funcionario_id: string
          id?: string
          pago?: boolean
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          fechamento_id?: string | null
          funcionario_id?: string
          id?: string
          pago?: boolean
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_funcionarios_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_pagar: {
        Row: {
          anexo_url: string | null
          conta_pagar_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          id: string
          numero_parcela: number
          status: Database["public"]["Enums"]["conta_status"]
          user_id: string
          valor_original: number
          valor_pago: number | null
        }
        Insert: {
          anexo_url?: string | null
          conta_pagar_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          id?: string
          numero_parcela: number
          status?: Database["public"]["Enums"]["conta_status"]
          user_id: string
          valor_original?: number
          valor_pago?: number | null
        }
        Update: {
          anexo_url?: string | null
          conta_pagar_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          id?: string
          numero_parcela?: number
          status?: Database["public"]["Enums"]["conta_status"]
          user_id?: string
          valor_original?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_pagar_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          employee_id: string
          hours_quantity: number | null
          id: string
          reference_month: string
          transaction_type: Database["public"]["Enums"]["payroll_transaction_type"]
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          employee_id: string
          hours_quantity?: number | null
          id?: string
          reference_month: string
          transaction_type: Database["public"]["Enums"]["payroll_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          employee_id?: string
          hours_quantity?: number | null
          id?: string
          reference_month?: string
          transaction_type?: Database["public"]["Enums"]["payroll_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string
          created_at: string
          email: string
          id: string
          nome: string
          unidade: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string
          created_at?: string
          email: string
          id?: string
          nome: string
          unidade?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          unidade?: string
          user_id?: string
        }
        Relationships: []
      }
      user_access_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      user_is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      conta_status: "pendente" | "pago" | "atrasado"
      frente_tipo: "Japa" | "Trattoria" | "Ambas"
      payroll_transaction_type:
        | "vale"
        | "bonus"
        | "desconto"
        | "adicional_noturno"
      setor_tipo: "Garçom" | "Cozinha" | "Administrativo"
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
      conta_status: ["pendente", "pago", "atrasado"],
      frente_tipo: ["Japa", "Trattoria", "Ambas"],
      payroll_transaction_type: [
        "vale",
        "bonus",
        "desconto",
        "adicional_noturno",
      ],
      setor_tipo: ["Garçom", "Cozinha", "Administrativo"],
    },
  },
} as const
