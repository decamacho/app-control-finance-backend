import { Injectable } from '@nestjs/common';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';

@Injectable()
export class SplitsService {
  create(createSplitDto: CreateSplitDto) {
    return 'This action adds a new split';
  }

  findAll() {
    return `This action returns all splits`;
  }

  findOne(id: number) {
    return `This action returns a #${id} split`;
  }

  update(id: number, updateSplitDto: UpdateSplitDto) {
    return `This action updates a #${id} split`;
  }

  remove(id: number) {
    return `This action removes a #${id} split`;
  }
}
