import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Record } from './record.schema';
import { RecordCategory, RecordFormat } from './record.enum';

export interface RecordFilter {
  q?: string;
  artist?: string;
  album?: string;
  format?: RecordFormat;
  category?: RecordCategory;
}

@Injectable()
export class RecordRepository {
  constructor(
    @InjectModel('Record') private readonly recordModel: Model<Record>,
  ) {}

  async create(data: Partial<Record>): Promise<Record> {
    return await this.recordModel.create(data);
  }

  async findById(id: string): Promise<Record | null> {
    return await this.recordModel.findById(id).exec();
  }

  async findAll(filter: RecordFilter = {}): Promise<Record[]> {
    return await this.recordModel.find(this.buildQuery(filter)).exec();
  }

  async updateById(id: string, data: Partial<Record>): Promise<Record | null> {
    return await this.recordModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<Record | null> {
    return await this.recordModel.findByIdAndDelete(id).exec();
  }

  async decrementStockIfAvailable(
    recordId: string,
    quantity: number,
  ): Promise<Record | null> {
    return await this.recordModel
      .findOneAndUpdate(
        { _id: recordId, qty: { $gte: quantity } },
        { $inc: { qty: -quantity } },
        { new: true },
      )
      .exec();
  }

  async incrementStock(
    recordId: string,
    quantity: number,
  ): Promise<Record | null> {
    return await this.recordModel
      .findByIdAndUpdate(recordId, { $inc: { qty: quantity } }, { new: true })
      .exec();
  }

  private buildQuery(filter: RecordFilter): FilterQuery<Record> {
    const query: FilterQuery<Record> = {};

    if (filter.q) {
      const searchRegex = new RegExp(filter.q, 'i');
      query.$or = [
        { artist: searchRegex },
        { album: searchRegex },
        { category: searchRegex },
      ];
    }

    if (filter.artist) query.artist = new RegExp(filter.artist, 'i');
    if (filter.album) query.album = new RegExp(filter.album, 'i');
    if (filter.format) query.format = filter.format;
    if (filter.category) query.category = filter.category;

    return query;
  }
}
