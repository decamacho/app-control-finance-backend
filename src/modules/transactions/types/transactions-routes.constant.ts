export const TRANSACTION_ROUTE_PREFIX = 'transactions';

export const TRANSACTION_ROUTES = {
  TYPES: `${TRANSACTION_ROUTE_PREFIX}/types`,
  DETAILS: `${TRANSACTION_ROUTE_PREFIX}/details`,
  SAVINGS: `${TRANSACTION_ROUTE_PREFIX}/savings-goals`,
  TRANSFER: 'transfer',
  SPLIT: 'split',
  HISTORY: 'history',
  PENDING: 'pending',
  REFUND: ':id/refund',
} as const;
