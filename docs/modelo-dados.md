# Modelo de dados

Banco PostgreSQL hospedado no Supabase (região São Paulo).
Os arquivos que criam cada tabela estão em [`sql/`](../sql), numerados na ordem de execução.

## Diagrama

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "tem 1 perfil"
    PROFILES ||--o{ PLATFORMS : "cria (opcional)"
    PROFILES ||--o{ EXPENSE_CATEGORIES : "cria (opcional)"
    PROFILES ||--o{ SHIFTS : "trabalha"
    SHIFTS ||--o{ BREAKS : "tem"
    SHIFTS |o--o{ EARNINGS : "gera"
    SHIFTS |o--o{ EXPENSES : "gera"
    PLATFORMS ||--o{ EARNINGS : "origem"
    EXPENSE_CATEGORIES ||--o{ EXPENSES : "tipo"

    PROFILES {
        uuid id PK "= auth.users.id"
        text full_name
        text avatar_url
        numeric hourly_goal "meta R$/hora"
        text plan "free | standard | premium"
        timestamptz created_at
    }
    PLATFORMS {
        bigint id PK
        uuid user_id FK "vazio = padrão"
        text name
        boolean is_active
        timestamptz created_at
    }
    EXPENSE_CATEGORIES {
        bigint id PK
        uuid user_id FK "vazio = padrão"
        text name
        text group_code "7 grupos fixos"
        boolean is_active
        timestamptz created_at
    }
    SHIFTS {
        bigint id PK
        uuid user_id FK
        date work_date "dia em que começou"
        timestamptz started_at
        timestamptz ended_at "vazio = turno aberto"
        text source "historico | sheets | app"
        text time_quality "real | ajustado"
        text notes
        timestamptz created_at
    }
    BREAKS {
        bigint id PK
        bigint shift_id FK
        uuid user_id FK
        timestamptz started_at
        timestamptz ended_at "vazio = pausa em andamento"
        timestamptz created_at
    }
    EARNINGS {
        bigint id PK
        uuid user_id FK
        date work_date
        bigint shift_id FK "pode ser vazio"
        bigint platform_id FK
        numeric amount "maior que 0"
        text source
        timestamptz created_at
    }
    EXPENSES {
        bigint id PK
        uuid user_id FK
        date work_date
        bigint shift_id FK "pode ser vazio"
        bigint category_id FK
        numeric amount "maior que 0"
        text description
        text fuel_type "gasolina | etanol | gnv | eletrico"
        text source
        timestamptz created_at
    }
```

## Como ler o diagrama

| Símbolo | Significado |
|---|---|
| `\|\|` | exatamente um |
| `\|o` | zero ou um (ligação opcional) |
| `o{` | zero ou muitos |

Exemplo: `PROFILES ||--o{ SHIFTS` = **um** motorista tem **zero ou muitos** turnos.

## Regras principais

- **Segurança (RLS):** todas as tabelas têm Row Level Security. Cada motorista só vê e altera as próprias linhas (`user_id = auth.uid()`). Plataformas e categorias padrão (`user_id` vazio) são visíveis para todos, mas só o sistema altera.
- **Plano protegido:** o motorista só pode editar `full_name`, `avatar_url` e `hourly_goal` do próprio perfil; o `plan` não.
- **Perfil automático:** um trigger cria o perfil no primeiro cadastro, já com nome e foto do Google.
- **Integridade:** valores sempre positivos; turno com no máximo 24h; fim depois do início; um único turno aberto por motorista; sem turnos duplicados (`user_id` + `started_at`).
- **Exclusão:** excluir a conta apaga todos os dados do motorista (LGPD). Excluir um turno apaga as pausas, mas mantém ganhos e despesas (só desfaz a ligação).

Regras de negócio e métricas: ver [`metricas.md`](metricas.md).
