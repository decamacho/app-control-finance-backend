import { InjectRepository } from '@nestjs/typeorm';
import { TransactionType } from '../entities/transaction-type.entity';
import { Repository } from 'typeorm/browser/repository/Repository.js';
import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator';
import { CreateTypeTransactionDto } from '../dto/create-type-transaction.dto';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateTypeTransactionDto } from '../dto/update-type-transaction.dto';

interface PostgresError {
  code: string;
  detail?: string;
  message: string;
}

@Injectable()
export class TypeTransactionService {
  constructor(
    @InjectRepository(TransactionType)
    private readonly typeTransactionRepository: Repository<TransactionType>,
  ) {}

  async createTypeTransaction(
    createTypeTransactionDto: CreateTypeTransactionDto,
  ): Promise<TransactionType> {
    try {
      const normalizedName = createTypeTransactionDto.typeTransaction
        .toUpperCase()
        .trim();

      const newTypeTransaction = this.typeTransactionRepository.create({
        ...createTypeTransactionDto,
        typeTransaction: normalizedName,
      });

      return await this.typeTransactionRepository.save(newTypeTransaction);
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException('Transaction type already exists');
      }

      throw new InternalServerErrorException('Error creating transaction type');
    }
  }

  async findAllTypeTransactions(): Promise<TransactionType[]> {
    return await this.typeTransactionRepository.find({
      order: { typeTransaction: 'DESC' },
    });
  }

  async findOneTypeTransaction(
    idTypeTransaction: string,
  ): Promise<TransactionType> {
    const typeTransaction = await this.typeTransactionRepository.findOne({
      where: { idTypeTransaction },
    });

    if (!typeTransaction) {
      throw new NotFoundException(
        `Transaction type with ID ${idTypeTransaction} not found`,
      );
    }
    return typeTransaction;
  }

  async updateTypeTransaction(
    idTypeTransaction: string,
    updateTypeTransactionDto: UpdateTypeTransactionDto,
  ): Promise<TransactionType> {
    const typeTransaction =
      await this.findOneTypeTransaction(idTypeTransaction);

    if (updateTypeTransactionDto.typeTransaction) {
      updateTypeTransactionDto.typeTransaction =
        updateTypeTransactionDto.typeTransaction.toUpperCase().trim();
    }

    try {
      const updatedTypeTransaction = this.typeTransactionRepository.merge(
        typeTransaction,
        updateTypeTransactionDto,
      );
      return await this.typeTransactionRepository.save(updatedTypeTransaction);
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException('Transaction type already exists');
      }
      throw new InternalServerErrorException('Error updating transaction type');
    }
  }

  async removeTypeTransaction(
    idTypeTransaction: string,
  ): Promise<{ message: string }> {
    const typeTransaction =
      await this.findOneTypeTransaction(idTypeTransaction);

    try {
      await this.typeTransactionRepository.remove(typeTransaction);
      return {
        message: `Transaction type '${typeTransaction.typeTransaction}' was successfully deleted.`,
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;

      if (dbError.code === '23503') {
        throw new ConflictException(
          `Cannot delete transaction type '${typeTransaction.typeTransaction}' because it is associated with existing transactions.`,
        );
      }
      throw new InternalServerErrorException('Error deleting transaction type');
    }
  }
}
