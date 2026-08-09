---
name: 01-financial-core-02-wallets
description: Gestión completa de billeteras - creación, tipos, monedas, saldos
priority: high
parent: 01-financial-core
---

# Plan: Billeteras

## Objetivo

Implementar sistema completo de billeteras:
- Billeteras personales
- Tipos de billeteras (efectivo, banco, inversión, etc.)
- Multi-moneda
- Seguimiento de saldo en tiempo real
- Estados (activa, archivada, bloqueada)

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Actualizar WalletType enum | `src/modules/wallets/entities/wallet-type.entity.ts` | - |
| 02 | Crear DTO de billetera extendida | `src/modules/wallets/dto/wallet.dto.ts` | - |
| 03 | Implementar WalletService avanzado | `src/modules/wallets/wallets.service.ts` | - |
| 04 | Sistema de seguimiento de saldo | `src/modules/wallets/services/balance.service.ts` | - |
| 05 | Billeteras multi-moneda | `src/modules/wallets/services/currency.service.ts` | - |
| 06 | API de conversión de moneda | `src/modules/wallets/services/exchange-rate.service.ts` | - |

## Tipos de Billetera

| Tipo | Descripción |
|------|-------------|
| CASH | Efectivo físico |
| CHECKING | Cuenta corriente |
| SAVINGS | Cuenta de ahorro |
| CREDIT_CARD | Tarjeta de crédito |
| INVESTMENT | Inversión (acciones, fondos) |
| CRYPTO | Criptomoneda |
| WALLET | Billetera digital |

## Billetera - Estructura

```typescript
@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  idWallet!: string;

  @Column({ type: 'varchar', length: 100 })
  nameWallet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balanceWallet!: number;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  currencyWallet!: string;

  @Column({ type: 'enum', enum: WalletType })
  typeWallet!: WalletType;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  statusWallet!: string;

  @Column({ type: 'text', nullable: true })
  descriptionWallet!: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  colorWallet!: string | null;  // Hex color

  @Column({ type: 'varchar', length: 20, nullable: true })
  iconWallet!: string | null;   // Icon name

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  user!: User;
}
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/wallets` | Crear billetera |
| GET | `/wallets` | Listar billeteras del usuario |
| GET | `/wallets/:id` | Detalle billetera |
| PATCH | `/wallets/:id` | Actualizar billetera |
| DELETE | `/wallets/:id` | Archivar billetera |
| POST | `/wallets/:id/set-default` | Establecer como predeterminada |
| GET | `/wallets/balance/total` | Balance total en todas las monedas |

## Cálculo de Saldo

```
balance = SUM(income transactions) - SUM(expense transactions) + SUM(transfers in) - SUM(transfers out)
```

El saldo se calcula en tiempo real basado en transacciones. No se almacena directamente para evitar inconsistencias.

## Monedas Soportadas

- COP (Peso colombiano)
- USD (Dólar estadounidense)
- EUR (Euro)
- GBP (Libra esterlina)

## Consideraciones

- Una billetera por defecto al crear usuario
- Validar nombre único por usuario
- Moneda no editable si tiene transacciones
- Arqueo de caja para billeteras de efectivo