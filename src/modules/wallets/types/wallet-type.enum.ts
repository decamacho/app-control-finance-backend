export enum WalletType {
  CASH = 'CASH',
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT = 'INVESTMENT',
  CRYPTO = 'CRYPTO',
  WALLET = 'WALLET',
}

export const SUPPORTED_WALLET_TYPES = Object.values(WalletType) as string[];
