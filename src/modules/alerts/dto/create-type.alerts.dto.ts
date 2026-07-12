import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { AlertType } from '../interfaces/alerts-type.interfaces';
import type { TriggerConfig } from '../interfaces/alerts-type.interfaces';

export class CreaTypeAlertDto {
  @IsNotEmpty({ message: 'The title of the alert is required' })
  @IsString()
  @Length(2, 100)
  titleAlert!: string;

  @IsNotEmpty({ message: 'The message of the alert is required' })
  @IsString()
  @Length(2, 255)
  messageAlert!: string;

  @IsNotEmpty({ message: 'The type of alert is required' })
  @IsEnum(AlertType, {
    message: `Type of alert must be one of the following: ${Object.values(AlertType).join(', ')}`,
  })
  typeAlert!: AlertType;

  @IsNotEmpty()
  @IsBoolean()
  isActive!: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isRead!: boolean;

  @IsOptional()
  @IsDate({ message: 'The reminder date must be a valid date' })
  reminderDate!: Date;

  @IsNotEmpty()
  @IsObject({
    message: 'The trigger configuration must be a valid JSON object',
  })
  triggerConfig!: TriggerConfig;

  @IsUUID('4')
  @IsNotEmpty()
  @IsString()
  idTransaction!: string;
}
