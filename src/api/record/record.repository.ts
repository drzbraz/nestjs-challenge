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
  limit?: number;
  offset?: number;
  total?: number;
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
    return await this.recordModel.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findAll(filter: RecordFilter = {}) {
    const limit = Math.min(Number(filter.limit) || 20, 100);
    const offset = Math.max(Number(filter.offset) || 0, 0);

    const query = {
      ...this.buildQuery(filter),
      deletedAt: { $exists: false },
    };

    const [records, total] = await Promise.all([
      this.recordModel.find(query).limit(limit).skip(offset).exec(),
      this.recordModel.countDocuments(query).exec(),
    ]);

    return {
      data: records,
      total,
      limit,
      offset,
    };
  }

  async updateById(id: string, update: Partial<Record>) {
    return await this.recordModel
      .findOneAndUpdate({ _id: id, deletedAt: { $exists: false } }, update, {
        new: true,
      })
      .exec();
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
