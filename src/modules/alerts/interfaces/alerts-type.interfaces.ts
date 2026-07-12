export interface TimeTriggerConfig {
  targetDate: Date;
  isRecurring: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

export interface LocationTriggerConfig {
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  locationName?: string;
  triggerOn: 'ENTER' | 'EXIT' | 'BOTH';
}

export interface BudgetThresholdTriggerConfig {
  idCategory: string;
  thresholdPercentage: number;
  period: 'MONTHLY' | 'WEEKLY';
}

export interface LowBalanceTriggerConfig {
  thresholdAmount: number;
  currency: string;
}

export type TriggerConfig =
  | TimeTriggerConfig
  | LocationTriggerConfig
  | BudgetThresholdTriggerConfig
  | LowBalanceTriggerConfig;

export enum AlertType {
  TIME = 'TIME',
  LOCATION = 'LOCATION',
  BUDGET_THRESHOLD = 'BUDGET_THRESHOLD',
  LOW_BALANCE = 'LOW_BALANCE',
}
