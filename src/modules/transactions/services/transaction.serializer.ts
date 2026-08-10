import { Transaction } from '../entities/transaction.entity';

export interface TransactionSummary {
  idTransaction: string;
  amount: number;
  currencyTransaction: string;
  description: string | null;
  transactionDate: Date;
  typeTransaction: string | undefined;
  stateTransaction: string;
  isRecurring: boolean;
  recurrencePattern: string | null;
  idParentTransaction: string | null;
  idGoal: string | null;
  createdAt: Date;
}

export function serializeTransaction(
  transaction: Transaction,
): TransactionSummary {
  return {
    idTransaction: transaction.idTransaction,
    amount: Number(transaction.amount),
    currencyTransaction: transaction.currencyTransaction,
    description: transaction.description,
    transactionDate: transaction.transactionDate,
    typeTransaction: transaction.typeTransaction?.typeTransaction,
    stateTransaction: transaction.stateTransaction,
    isRecurring: transaction.isRecurring,
    recurrencePattern: transaction.recurrencePattern,
    idParentTransaction: transaction.idParentTransaction,
    idGoal: transaction.goal?.idGoal ?? null,
    createdAt: transaction.createdAt,
  };
}
