---
name: 01-financial-core
description: Plan maestro para el núcleo financiero de Wallet AI - Transacciones, billeteras, presupuestos, metas
priority: high
---

# Plan: Núcleo Financiero Wallet AI

## Objetivo

Implementar el sistema completo de gestión financiera incluyendo:
- Transacciones (ingresos, pagos, transferencias)
- Billeteras y cuentas
- Metas de ahorro
- Presupuestos
- Alertas financieras
- Cuentas compartidas
- Categorías inteligentes

## Sub-Plans

| Archivo | Tema | Prioridad |
|---------|------|-----------|
| `01-financial-core-01-transactions.md` | Transacciones completas | high |
| `01-financial-core-02-wallets.md` | Billeteras y cuentas | high |
| `01-financial-core-03-budgets-goals.md` | Presupuestos y metas | high |
| `01-financial-core-04-alerts.md` | Alertas financieras | medium |
| `01-financial-core-05-shared-accounts.md` | Cuentas compartidas | medium |
| `01-financial-core-06-categories.md` | Categorías inteligentes | high |
| `01-financial-core-07-dashboard.md` | Dashboard y analytics | high |
| `01-financial-core-08-triggers.md` | Disparadores internos | high |

## Dependencias Comunes

```json
{
  "@nestjs/schedule": "^4.0.0",
  "class-transformer": "^0.5.1"
}
```

## Variables de Entorno

```env
# Notifications
ALERT_CHECK_CRON=0 * * * * *  # Every hour

# Smart Categories
AI_CATEGORY_ENABLED=true
```

## Cronograma Sugerido

- **Semana 1**: Transacciones + Billeteras
- **Semana 2**: Presupuestos + Metas + Categorías
- **Semana 3**: Alertas + Dashboard
- **Semana 4**: Cuentas compartidas + Disparadores