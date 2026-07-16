---
name: 01-financial-core-04-alerts
description: Sistema de alertas financieras - tiempo, presupuesto, meta
priority: medium
parent: 01-financial-core
---

# Plan: Alertas

## Objetivo

Implementar sistema de alertas financieras:
- Alertas de tiempo (recordatorios)
- Alertas de presupuesto
- Alertas de meta
- Alertas de cuenta
- Notificaciones push/email

## Tipos de Alerta

| Tipo | Descripción | Disparador |
|------|-------------|------------|
| REMINDER | Recordatorio de pago | Tiempo/fecha |
| BUDGET_WARNING | Presupuesto nearing limit | Transacción |
| BUDGET_EXCEEDED | Presupuesto excedido | Transacción |
| GOAL_MILESTONE | Meta alcanzada | Progreso |
| LOW_BALANCE | Balance bajo | Transacción |
| SAVING_OPPORTUNITY | Oportunidad de ahorro | IA/Regla |

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Actualizar AlertService | `src/modules/alerts/services/alerts.service.ts` | - |
| 02 | Sistema de scheduling | `src/modules/alerts/services/alert-scheduler.service.ts` | - |
| 03 | Tipos de alerta extendidos | `src/modules/alerts/entities/alert.entity.ts` | - |
| 04 | Notificaciones | `src/modules/alerts/services/notification.service.ts` | - |
| 05 | Integración con presupuestos | - | 01 |
| 06 | Integración con metas | - | 01 |

## Alerta - Estructura

```typescript
@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  idAlert!: string;

  @Column({ type: 'varchar', length: 50 })
  typeAlert!: string;  // REMINDER, BUDGET_WARNING, etc.

  @Column({ type: 'varchar', length: 200 })
  titleAlert!: string;

  @Column({ type: 'text' })
  messageAlert!: string;

  @Column({ type: 'enum', enum: AlertPriority })
  priority!: AlertPriority;  // LOW, MEDIUM, HIGH

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  triggeredAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;  // Extra data

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  user!: User;
}
```

## Alertas de Tiempo (Recordatorios)

```typescript
// Schedule-based alerts
@Entity('scheduled_alerts')
export class ScheduledAlert {
  @PrimaryGeneratedColumn('uuid')
  idScheduledAlert!: string;

  @Column({ type: 'varchar', length: 50 })
  typeAlert!: string;  // ONE_TIME, RECURRING

  @Column({ type: 'varchar', length: 200 })
  titleAlert!: string;

  @Column({ type: 'text' })
  messageAlert!: string;

  @Column({ type: 'timestamp' })
  scheduledFor!: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recurrencePattern!: string | null;  // DAILY, WEEKLY, MONTHLY

  @Column({ type: 'jsonb', nullable: true })
  recurrenceEnd!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  user!: User;
}
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/alerts` | Crear alerta |
| GET | `/alerts` | Listar alertas |
| GET | `/alerts/unread` | Alertas no leídas |
| PATCH | `/alerts/:id/read` | Marcar como leída |
| DELETE | `/alerts/:id` | Eliminar alerta |
| POST | `/alerts/schedule` | Programar alerta |

## Cron Jobs

```typescript
@Cron('0 * * * *')  // Every hour
async checkAlerts() {
  // Check scheduled alerts
  // Check budget thresholds
  // Check goal milestones
  // Check balance thresholds
}
```

## Notificaciones

| Canal | Descripción |
|-------|-------------|
| IN_APP | Notificación en la app |
| EMAIL | Email al usuario |
| PUSH | Push notification |

## Metadata por Tipo

```typescript
// BUDGET_WARNING
{ budgetId, categoryId, percentUsed, amountRemaining }

// GOAL_MILESTONE  
{ goalId, percentComplete, amountRemaining }

// REMINDER
{ relatedTransactionId, dueDate }

// LOW_BALANCE
{ walletId, currentBalance, threshold }
```