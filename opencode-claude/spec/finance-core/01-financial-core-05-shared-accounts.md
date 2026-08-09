---
name: 01-financial-core-05-shared-accounts
description: Cuentas compartidas - invitar usuarios, permisos, splits automáticos
priority: medium
parent: 01-financial-core
---

# Plan: Cuentas Compartidas

## Objetivo

Implementar cuentas compartidas:
- Compartir billeteras con otros usuarios
- Sistema de invitaciones
- Permisos granulares
- Splits automáticos en transacciones compartidas
- Historial de actividad

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Entidad de compartición | `src/modules/wallets/entities/wallet-share.entity.ts` | - |
| 02 | Sistema de invitaciones | `src/modules/wallets/services/share-invite.service.ts` | - |
| 03 | Permisos y roles | `src/modules/wallets/services/permissions.service.ts` | - |
| 04 | Splits automáticos | `src/modules/wallets/services/auto-split.service.ts` | - |
| 05 | Activity log | `src/modules/wallets/services/activity-log.service.ts` | - |

## Roles en Cuenta Compartida

| Rol | Permisos |
|-----|----------|
| OWNER | Full access, can delete, manage invites |
| ADMIN | Manage members, view all, edit |
| MEMBER | View, create transactions |
| VIEWER | Read-only access |

## Permisos

| Permiso | Descripción |
|---------|-------------|
| VIEW | Ver transacciones y saldo |
| CREATE_TRANSACTION | Crear transacciones |
| EDIT_TRANSACTION | Editar transacciones propias |
| DELETE_TRANSACTION | Eliminar transacciones propias |
| MANAGE_MEMBERS | Gestionar miembros |
| MANAGE_SETTINGS | Configurar billetera |

## Estructura - Wallet Share

```typescript
@Entity('wallet_shares')
export class WalletShare {
  @PrimaryGeneratedColumn('uuid')
  idWalletShare!: string;

  @Column({ type: 'uuid' })
  idWallet!: string;

  @Column({ type: 'uuid' })
  idUser!: string;  // User with access

  @Column({ type: 'enum', enum: ShareRole })
  role!: ShareRole;  // OWNER, ADMIN, MEMBER, VIEWER

  @Column({ type: 'jsonb', default: [] })
  permissions!: string[];

  @Column({ type: 'boolean', default: true })
  canCreateTransactions!: boolean;

  @Column({ type: 'boolean', default: false })
  canDeleteTransactions!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;
}
```

## Estructura - Invite

```typescript
@Entity('wallet_invites')
export class WalletInvite {
  @PrimaryGeneratedColumn('uuid')
  idInvite!: string;

  @Column({ type: 'uuid' })
  idWallet!: string;

  @Column({ type: 'uuid' })
  invitedBy!: string;  // User ID

  @Column({ type: 'varchar', length: 100 })
  emailInvited!: string;

  @Column({ type: 'varchar', length: 50 })
  role!: ShareRole;

  @Column({ type: 'varchar', length: 6 })
  token!: string;  // Unique token

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'enum', enum: InviteStatus })
  status!: InviteStatus;  // PENDING, ACCEPTED, EXPIRED, REJECTED
}
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/wallets/:id/share` | Compartir billetera |
| POST | `/wallets/:id/invite` | Enviar invitación |
| GET | `/wallets/:id/members` | Listar miembros |
| PATCH | `/wallets/:id/members/:userId` | Actualizar permisos |
| DELETE | `/wallets/:id/members/:userId` | Remover miembro |
| POST | `/invites/:token/accept` | Aceptar invitación |
| POST | `/invites/:token/reject` | Rechazar invitación |

## Flujo de Invitación

```
1. Owner sends invite to email
2. System generates unique token
3. Invite expires in 7 days
4. Recipient clicks accept link
5. User created if doesn't exist
6. WalletShare created with role
7. Invite status updated to ACCEPTED
```

## Splits Automáticos

```typescript
// Example: Shared expenses
// 3 members, split equally (33.33% each)
{
  type: 'EQUAL',
  splits: [
    { userId: 'uuid1', percentage: 33.33 },
    { userId: 'uuid2', percentage: 33.33 },
    { userId: 'uuid3', percentage: 33.34 }
  ]
}
```

## Activity Log

```typescript
{
  action: 'TRANSACTION_CREATED',
  userId: 'uuid',
  walletId: 'uuid',
  details: { transactionId: 'uuid', amount: 100 },
  timestamp: '2024-01-15T10:30:00Z'
}
```

## Consideraciones de Seguridad

- Owner no puede ser removido
- Al menos un Owner debe existir
- Notificar a miembros de cambios
- Historial inmutable