---
name: 01-financial-core-08-triggers
description: Disparadores y procesos internos - Cron jobs, events, automation
priority: high
parent: 01-financial-core
---

# Plan: Disparadores y Procesos Internos

## Objetivo

Implementar procesos automatizados:
- Cron jobs para tareas programadas
- Event listeners para triggers
- Automatizaciones de presupuesto
- Recurrencias de transacciones
- Limpieza de datos

## Procesos Automatizados

| Proceso | Frecuencia | Descripción |
|---------|------------|-------------|
| Budget Reset | Weekly/Monthly | Reiniciar presupuestos |
| Goal Contribution | Daily | Aportes automáticos a metas |
| Alert Check | Hourly | Verificar alertas programadas |
| Session Cleanup | Daily | Limpiar sesiones expiradas |
| Recurring Transactions | Daily | Procesar transacciones recurrentes |
| Category Sync | Daily | Sincronizar categorías |
| Data Cleanup | Weekly | Limpiar datos temporales |

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | CronModule setup | `src/modules/automation/cron.module.ts` | - |
| 02 | Budget scheduler | `src/modules/automation/budget-scheduler.service.ts` | - |
| 03 | Goal contributor | `src/modules/automation/goal-contributor.service.ts` | - |
| 04 | Recurring processor | `src/modules/automation/recurring-processor.service.ts` | - |
| 05 | Alert checker | `src/modules/automation/alert-checker.service.ts` | - |
| 06 | Transaction events | `src/modules/automation/transaction-events.service.ts` | - |

## Cron Jobs

```typescript
@Module({
  providers: [
    BudgetSchedulerService,
    GoalContributorService,
    RecurringProcessorService,
    AlertCheckerService,
    SessionCleanupService,
  ],
})
export class AutomationModule {}
```

## Budget Reset Service

```typescript
@Cron('0 0 1 * *')  // First day of month at midnight
async resetMonthlyBudgets() {
  const budgets = await this.budgetRepository.find({
    where: { period: BudgetPeriod.MONTHLY }
  });
  
  for (const budget of budgets) {
    budget.spentAmount = 0;
    budget.startDate = new Date();
    budget.endDate = addMonths(new Date(), 1);
  }
  
  await this.budgetRepository.save(budgets);
}
```

## Goal Auto-Contribution

```typescript
@Cron('0 6 * * *')  // Daily at 6 AM
async processGoalContributions() {
  const goals = await this.goalRepository.find({
    where: { autoContribute: true, isCompleted: false }
  });
  
  for (const goal of goals) {
    // Transfer from main wallet to goal wallet
    await this.transactionService.create({
      amount: goal.contributionAmount,
      type: TransactionType.EXPENSE,
      category: 'Goal Contribution',
      wallet: goal.wallet,
      isRecurring: true
    });
  }
}
```

## Recurring Transactions

```typescript
@Cron('0 7 * * *')  // Daily at 7 AM
async processRecurringTransactions() {
  const recurring = await this.transactionRepository.find({
    where: { isRecurring: true }
  });
  
  for (const transaction of recurring) {
    const shouldProcess = this.shouldProcessRecurring(transaction);
    if (shouldProcess) {
      await this.createRecurringTransaction(transaction);
    }
  }
}

private shouldProcessRecurring(transaction: Transaction): boolean {
  const now = new Date();
  const lastProcessed = transaction.lastProcessedAt;
  
  switch (transaction.recurrencePattern) {
    case 'DAILY':
      return isAfter(now, addDays(lastProcessed, 1));
    case 'WEEKLY':
      return isAfter(now, addWeeks(lastProcessed, 1));
    case 'MONTHLY':
      return isAfter(now, addMonths(lastProcessed, 1));
    default:
      return false;
  }
}
```

## Transaction Events (Implicit Processes)

```typescript
// When transaction is created
@Injectable()
export class TransactionEventsService {
  @OnEvent('transaction.created')
  async handleTransactionCreated(event: TransactionEvent) {
    // 1. Update budget spent
    await this.updateBudgetSpent(event.transaction);
    
    // 2. Check budget alerts
    await this.checkBudgetAlerts(event.transaction);
    
    // 3. Update goal progress
    await this.updateGoalProgress(event.transaction);
    
    // 4. Auto-categorize if needed
    await this.autoCategorize(event.transaction);
    
    // 5. Check spending patterns
    await this.analyzeSpending(event.transaction);
  }
  
  @OnEvent('transaction.deleted')
  async handleTransactionDeleted(event: TransactionEvent) {
    // Reverse budget updates
    // Reverse goal progress
  }
}
```

## Event Listeners

| Evento | Acción |
|--------|--------|
| `transaction.created` | Budget, Goals, Alerts, Analytics |
| `transaction.updated` | Recalculate affected metrics |
| `transaction.deleted` | Reverse calculations |
| `budget.exceeded` | Create alert, notify user |
| `goal.completed` | Create alert, celebration |
| `session.expired` | Create alert |

## Processes Table

```typescript
@Entity('processes')
export class Process {
  @PrimaryGeneratedColumn('uuid')
  idProcess!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: 'RUNNING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'timestamp' })
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date;

  @Column({ type: 'int', default: 0 })
  itemsProcessed!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;
}
```

## Automation Rules

```typescript
@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  idRule!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text' })
  trigger!: string;  // Event that triggers the rule

  @Column({ type: 'text' })
  action!: string;   // Action to perform

  @Column({ type: 'jsonb' })
  conditions!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  user!: User;
}
```

## Ejemplo de Regla de Automatización

```
Trigger: transaction.created
Condition: amount > 100 AND category = 'Groceries'
Action: create_alert(type='SAVING_OPPORTUNITY')
```

## Health Check

```typescript
@Cron('0 0 * * *')  // Hourly
async healthCheck() {
  const processes = await this.processRepository.find({
    where: { status: 'RUNNING' }
  });
  
  if (processes.length > 0) {
    // Alert if processes running too long
    for (const process of processes) {
      const duration = differenceInHours(new Date(), process.startedAt);
      if (duration > 1) {
        await this.alertService.create({
          type: 'PROCESS_STUCK',
          message: `Process ${process.name} running for ${duration} hours`
        });
      }
    }
  }
}
```