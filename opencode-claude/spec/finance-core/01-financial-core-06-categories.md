---
name: 01-financial-core-06-categories
description: Categorías inteligentes - creación automática, asignación por IA, categorías por defecto
priority: high
parent: 01-financial-core
---

# Plan: Categorías Inteligentes

## Objetivo

Implementar sistema de categorías avanzado:
- Categorías por defecto del sistema
- Categorías personalizadas por usuario
- Creación automática si no existe
- Sugerencia de categoría por descripción
- Patrones de categoría (keywords)

## Tareas

| # | Descripción | Archivo | Dep |
|---|-------------|---------|-----|
| 01 | Seed de categorías por defecto | `src/modules/categories/seeds/default-categories.seed.ts` | - |
| 02 | Auto-creación de categorías | `src/modules/categories/services/auto-category.service.ts` | - |
| 03 | Sistema de patrones | `src/modules/categories/services/category-pattern.service.ts` | - |
| 04 | Sugerencia de categoría | `src/modules/categories/services/category-suggester.service.ts` | - |
| 05 | API de categorías | `src/modules/categories/categories.controller.ts` | - |

## Categorías por Defecto

### Ingresos
| Categoría | Icon | Color |
|-----------|------|-------|
| Salary | briefcase | #4CAF50 |
| Freelance | laptop | #8BC34A |
| Investment | trending-up | #009688 |
| Gift | gift | #E91E63 |
| Other Income | wallet-in | #607D8B |

### Gastos
| Categoría | Icon | Color |
|-----------|------|-------|
| Food & Dining | restaurant | #FF9800 |
| Transportation | directions-car | #2196F3 |
| Shopping | shopping-bag | #E91E63 |
| Entertainment | movie | #9C27B0 |
| Bills & Utilities | receipt | #F44336 |
| Health | local-hospital | #4CAF50 |
| Education | school | #3F51B5 |
| Travel | flight | #00BCD4 |
| Groceries | local-grocery-store | #8BC34A |
| Other Expense | wallet-out | #607D8B |

## Categoría - Estructura

```typescript
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  idCategory!: string;

  @Column({ type: 'varchar', length: 100 })
  nameCategory!: string;

  @Column({ type: 'varchar', length: 7 })
  colorCategory!: string;  #FF9800

  @Column({ type: 'varchar', length: 50 })
  iconCategory!: string;   // Icon name

  @Column({ type: 'enum', enum: CategoryType })
  typeCategory!: CategoryType;  // INCOME, EXPENSE

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;  // Cannot be deleted

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;  // Default for new wallets

  @Column({ type: 'jsonb', nullable: true })
  keywords!: string[];  // For auto-categorization

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idUser' })
  userOwner!: User | null;
}
```

## Patrones de Categoría

```typescript
@Entity('category_patterns')
export class CategoryPattern {
  @PrimaryGeneratedColumn('uuid')
  idPattern!: string;

  @Column({ type: 'uuid' })
  idCategory!: string;

  @Column({ type: 'varchar', length: 100 })
  keyword!: string;  // "netflix" -> "Entertainment"

  @Column({ type: 'varchar', length: 10 })
  matchType!: string;  // EXACT, CONTAINS, REGEX

  @Column({ type: 'int', default: 100 })
  confidence!: number;  // 0-100

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idUser' })
  user!: User | null;
}
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/categories` | Listar categorías |
| POST | `/categories` | Crear categoría |
| POST | `/categories/auto` | Crear si no existe |
| GET | `/categories/suggest` | Sugerir categoría |
| POST | `/categories/pattern` | Agregar patrón |
| GET | `/categories/defaults` | Obtener categorías por defecto |

## Flujo de Auto-categorización

```
1. Transaction created with description
2. System searches patterns (user > system)
3. If match found → assign category
4. If no match → suggest category
5. User confirms → save as pattern
```

## API de Sugerencia

```typescript
// GET /categories/suggest?description=Netflix subscription
{
  suggested: {
    idCategory: "uuid",
    nameCategory: "Entertainment",
    confidence: 85
  },
  alternatives: [
    { idCategory: "uuid", nameCategory: "Subscriptions", confidence: 60 }
  ]
}
```

## API de Auto-creación

```typescript
// POST /categories/auto
{
  nameCategory: "Netflix",
  typeCategory: "EXPENSE",
  colorCategory: "#E91E63",
  iconCategory: "tv"
}

// Returns existing category if found, or creates new one
{
  idCategory: "uuid",
  nameCategory: "Netflix",
  isNew: false  // true if created
}
```

## Keyword Matching

| Tipo | Ejemplo | Match |
|------|---------|-------|
| EXACT | "uber" | "uber" only |
| CONTAINS | "uber" | "uber", "uberEats", "ride uber" |
| REGEX | "^MC.*" | "MCDonald", "McDonalds" |