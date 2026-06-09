/**
 * 🗺️ Mapa Global de Rutas para el Dominio de Transacciones.
 * Centraliza los prefijos para cumplir con el principio DRY (Don't Repeat Yourself).
 */

export const TRANSACTION_ROUTE_PREFIX = 'transactions';

export const TRANSACTION_ROUTES = {
  TYPES: `${TRANSACTION_ROUTE_PREFIX}/types`,
  DETAILS: `${TRANSACTION_ROUTE_PREFIX}/details`,
  SAVINGS: `${TRANSACTION_ROUTE_PREFIX}/savings-goals`,
} as const;
