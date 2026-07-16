---
name: 01-financial-core-03-budgets-goals
description: Gestión de presupuestos y metas de ahorro con seguimiento
priority: high
parent: 01-financial-core
---

# Plan: Presupuestos y Metas

## Objetivo

Implementar:
- Presupuestos por categoría
- Metas de ahorro
- Alertas de presupuesto
- Progress tracking
- Recompensas por cumplimiento

## Tareas - Presupuestos

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Actualizar BudgetService | `src/modules/budgets/budgets.service.ts` | - |
| 02 | Presupuesto por período | `src/modules/budgets/dto/budget-period.dto.ts` | - |
| 03 | Alertas de presupuesto | `src/modules/budgets/services/budget-alert.service.ts` | - |
| 04 | Dashboard de presupuesto | `src/modules/budgets/services/budget-dashboard.service.ts` | - |

## Tareas - Metas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 05 | Actualizar GoalService | `src/modules/goals/goals.service.ts` | - |
| 06 | Metas con contribuciones periódicas | `src/modules/goals/dto/goal-contribution.dto.ts` | - |
| 07 | Progress tracking automático | `src/modules/goals/services/goal-progress.service.ts` | - |
| 08 | Alertas de meta alcanzada | `src/modules/goals/services/goal-notification.service.ts` | - |

## Presupuesto - Estructura

```typescript
@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  idBudget!: string;

  @Column({ type: 'varchar', length: 100 })
  nameBudget!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  limitAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  spentAmount!: number;

  @Column({ type: 'enum', enum: BudgetPeriod })
  period!: BudgetPeriod;  // WEEKLY, MONTHLY, YEARLY

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'boolean', default: true })
  alertEnabled!: boolean;

  @Column({ type: 'int', default: 80 })
  alertThreshold!: number;  // Porcentaje para alerta

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'idCategory' })
  category!: Category;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'idWallet' })
  wallet!: Wallet;
}
```

## Meta de Ahorro - Estructura

```typescript
@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  idGoal!: string;

  @Column({ type: 'varchar', length: 100 })
  nameGoal!: string;

  @Column({ type: 'text', nullable: true })
  descriptionGoal!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  targetAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentAmount!: number;

  @Column({ type: 'timestamp' })
  targetDate!: Date;

  @Column({ type: 'enum', enum: GoalPriority })
  priority!: GoalPriority;  // LOW, MEDIUM, HIGH

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  autoContribute!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  contributionAmount!: number | null;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'idWallet' })
  wallet!: Wallet;
}
```

## Períodos de Presupuesto

| Período | Descripción | Reinicio |
|---------|-------------|----------|
| WEEKLY | Semanal | Cada lunes |
| MONTHLY | Mensual | Día 1 de cada mes |
| YEARLY | Anual | 1 de enero |

## Endpoints - Presupuestos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/budgets` | Crear presupuesto |
| GET | `/budgets` | Listar presupuestos |
| GET | `/budgets/:id/progress` | Ver progreso |
| PATCH | `/budgets/:id` | Actualizar presupuesto |
| GET | `/budgets/summary` | Resumen de todos |

## Endpoints - Metas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/goals` | Crear meta |
| GET | `/goals` | Listar metas |
| POST | `/goals/:id/contribute` | Aportar a meta |
| GET | `/goals/:id/progress` | Ver progreso |
| PATCH | `/goals/:id/complete` | Marcar completada |

## Lógica de Progress

```
// Presupuesto
spentAmount = SUM(transactions where category = budget.category AND date between start/end)

// Meta
progress = (currentAmount / targetAmount) * 100
estimatedCompletionDate = targetAmount / (currentAmount / daysElapsed)
```

## Alertas

| Tipo | Condición |
|------|-----------|
| PRESUPUESTO_80 | Gastado >= 80% del límite |
| PRESUPUESTO_100 | Gastado >= 100% (excedido) |
| META_50 | Meta alcanzado 50% |
| META_100 | Meta completada |
| META_ATRASADA | Fecha objetivo pasada sin completar |