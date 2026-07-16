---
name: 01-financial-core-07-dashboard
description: Dashboard y analytics - overview, charts, trends, statistics
priority: high
parent: 01-financial-core
---

# Plan: Dashboard y Analytics

## Objetivo

Implementar dashboard completo:
- Balance general
- Gráficos de ingresos/gastos
- Tendencias mensuales
- Estadísticas por categoría
- Forecast de gastos
- Comparativas

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Dashboard overview | `src/modules/dashboard/services/overview.service.ts` | - |
| 02 | Gráficos y tendencias | `src/modules/dashboard/services/charts.service.ts` | - |
| 03 | Estadísticas por categoría | `src/modules/dashboard/services/category-stats.service.ts` | - |
| 04 | Forecast de gastos | `src/modules/dashboard/services/forecast.service.ts` | - |
| 05 | Comparativas períodos | `src/modules/dashboard/services/comparison.service.ts` | - |

## Dashboard Overview

```typescript
interface DashboardOverview {
  totalBalance: number;
  currency: string;
  totalIncome: number;      // This month
  totalExpense: number;     // This month
  netSaving: number;        // Income - Expense
  incomeCount: number;
  expenseCount: number;
  
  // Quick stats
  biggestExpense: {
    category: string;
    amount: number;
  } | null;
  
  budgetStatus: {
    budgetId: string;
    name: string;
    percentUsed: number;
  }[];
  
  goalsProgress: {
    goalId: string;
    name: string;
    percentComplete: number;
  }[];
}
```

## Gráficos

### Balance Over Time
```typescript
{
  chartType: 'LINE',
  data: [
    { date: '2024-01', balance: 1000 },
    { date: '2024-02', balance: 1200 },
    { date: '2024-03', balance: 800 },
  ]
}
```

### Income vs Expense
```typescript
{
  chartType: 'BAR',
  data: [
    { month: 'Jan', income: 5000, expense: 3000 },
    { month: 'Feb', income: 5000, expense: 4000 },
  ]
}
```

### Expense by Category
```typescript
{
  chartType: 'PIE',
  data: [
    { category: 'Food', amount: 500, percent: 25 },
    { category: 'Transport', amount: 300, percent: 15 },
  ]
}
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/dashboard/overview` | Overview general |
| GET | `/dashboard/balance-history` | Historial de balance |
| GET | `/dashboard/income-expense` | Ingresos vs gastos |
| GET | `/dashboard/categories` | Stats por categoría |
| GET | `/dashboard/trends` | Tendencias |
| GET | `/dashboard/forecast` | Predicción de gastos |
| GET | `/dashboard/comparison` | Comparar períodos |

## Períodos Soportados

| Período | Descripción |
|---------|-------------|
| TODAY | Hoy |
| WEEK |Últimos 7 días |
| MONTH | Mes actual |
| LAST_MONTH | Mes anterior |
| QUARTER | Últimos 3 meses |
| YEAR | Año actual |
| CUSTOM | Rango personalizado |

## Forecast

```typescript
interface Forecast {
  predictedExpense: number;  // Next month
  confidence: number;        // 0-100
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: {
    category: string;
    expected: number;
    change: number;  // % change from previous
  }[];
}
```

## Statistics

| Métrica | Descripción |
|---------|-------------|
| Average Transaction | Promedio de transacciones |
| Most Common Category | Categoría más usada |
| Peak Spending Day | Día de mayor gasto |
| Savings Rate | Tasa de ahorro (income - expense / income) |
| Transaction Frequency | Frecuencia de transacciones |

## Cálculos

```typescript
// Net Savings
netSaving = totalIncome - totalExpense

// Savings Rate
savingsRate = (netSaving / totalIncome) * 100

// Average Daily Expense
avgDailyExpense = totalExpense / daysInPeriod

// Category Percentage
categoryPercent = (categoryTotal / periodTotal) * 100
```

## Cashflow

```typescript
interface Cashflow {
  startingBalance: number;
  income: number;
  expense: number;
  endingBalance: number;
  changes: {
    date: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
  }[];
}
```