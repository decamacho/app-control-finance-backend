---
name: 01-financial-core-01-transactions
description: Sistema completo de transacciones - ingresos, pagos, transferencias con splits
priority: high
parent: 01-financial-core
---

# Plan: Transacciones

## Objetivo

Implementar el sistema de transacciones completo:
- Ingresos (income)
- Pagos/Gastos (expense)
- Transferencias entre billeteras
- División de transacciones (splits)
- Reembolsos
- Categorización automática

## Tipos de Transacción

| Tipo | Signo | Descripción |
|------|-------|-------------|
| INCOME | + | Ingresos salary, inversiones |
| EXPENSE | - | Gastos y pagos |
| TRANSFER | 0 | Transferencia entre billeteras |

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Actualizar TransactionType enum | `src/modules/transactions/types/transactions-type.enum.ts` | - |
| 02 | Crear DTOs de transacción avanzada | `src/modules/transactions/dto/transaction.dto.ts` | - |
| 03 | Implementar TransactionService avanzado | `src/modules/transactions/services/transaction.service.ts` | - |
| 04 | Implementar transferencia entre billeteras | `src/modules/transactions/services/transfer.service.ts` | - |
| 05 | Implementar sistema de splits | `src/modules/splits/splits.service.ts` | - |
| 06 | Crear endpoint de reembolso | `src/modules/transactions/controllers/transactions.controller.ts` | - |
| 07 | Validación de negocio (saldos, límites) | `src/modules/transactions/services/transaction-validator.service.ts` | - |
| 08 | Historial de transacciones | `src/modules/transactions/services/transaction-history.service.ts` | - |

## Transacción - Estructura Completa

```typescript
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  idTransaction!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountTransaction!: number;

  @Column({ type: 'varchar', length: 3 })
  currencyTransaction!: string;

  @Column({ type: 'text', nullable: true })
  descriptionTransaction!: string | null;

  @Column({ type: 'enum', enum: TransactionType })
  typeTransaction!: TransactionType;

  @Column({ type: 'timestamp' })
  dateTransaction!: Date;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'idWallet' })
  wallet!: Wallet;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'idCategory' })
  category!: Category;

  @Column({ type: 'uuid', nullable: true })
  idParentTransaction!: string | null;  // For refunds

  @Column({ type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recurrencePattern!: string | null;  // daily, weekly, monthly
}
```

## Transferencia Entre Billeteras

```
1. Validate source wallet has sufficient balance
2. Create negative transaction on source wallet
3. Create positive transaction on destination wallet
4. Link both transactions (parent-child)
5. Update balances atomically
```

## Splits de Transacción

| Tipo Split | Descripción |
|------------|-------------|
| EQUAL | Dividir igualmente entre usuarios |
| PERCENTAGE | Porcentaje específico por usuario |
| EXACT | Monto exacto por usuario |
| SHARES | Cantidad de partes iguales |

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/transactions` | Crear transacción |
| POST | `/transactions/transfer` | Transferencia entre billeteras |
| POST | `/transactions/split` | Transacción con split |
| POST | `/transactions/:id/refund` | Reembolsar transacción |
| GET | `/transactions/history` | Historial con filtros |
| GET | `/transactions/pending` | Transacciones pendientes |

## Consideraciones Financieras

- Validar saldo suficiente en gastos
- Transacciones atómicas (rollback si falla)
- Historial inmutable (no delete, solo soft delete)
- Moneda compatible con la wallet
- Fecha puede ser futura (scheduled)