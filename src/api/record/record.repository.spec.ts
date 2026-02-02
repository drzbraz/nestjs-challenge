import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecordRepository } from './record.repository';
import { Record } from './record.schema';
import { RecordCategory, RecordFormat } from './record.enum';

describe('RecordRepository', () => {
  let repository: RecordRepository;
  let model: jest.Mocked<Model<Record>>;

  const mockRecord = {
    _id: '507f1f77bcf86cd799439011',
    artist: 'The Beatles',
    album: 'Abbey Road',
    price: 25,
    qty: 10,
    format: RecordFormat.VINYL,
    category: RecordCategory.ROCK,
    tracklist: [],
  };

  beforeEach(async () => {
    const mockModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordRepository,
        {
          provide: getModelToken('Record'),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<RecordRepository>(RecordRepository);
    model = module.get(getModelToken('Record'));
  });

  describe('create', () => {
    it('should create a record', async () => {
      model.create.mockResolvedValue(mockRecord as any);

      const result = await repository.create(mockRecord);

      expect(result).toEqual(mockRecord);
      expect(model.create).toHaveBeenCalledWith(mockRecord);
    });
  });

  describe('findById', () => {
    it('should find a record by id', async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRecord),
      } as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockRecord);
      expect(model.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should return null when record not found', async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all records without filters', async () => {
      const records = [mockRecord];
      model.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(records),
      } as any);

      const result = await repository.findAll({});

      expect(result).toEqual(records);
      expect(model.find).toHaveBeenCalledWith({});
    });

    it('should build query with artist filter (case-insensitive)', async () => {
      model.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRecord]),
      } as any);

      await repository.findAll({ artist: 'Beatles' });

      const calledQuery = (model.find as jest.Mock).mock.calls[0][0] as any;
      expect(calledQuery.artist).toBeInstanceOf(RegExp);
      expect(calledQuery.artist.flags).toBe('i');
    });

    it('should build query with category filter (exact match)', async () => {
      model.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRecord]),
      } as any);

      await repository.findAll({ category: RecordCategory.ROCK });

      expect(model.find).toHaveBeenCalledWith({
        category: RecordCategory.ROCK,
      });
    });

    it('should build query with format filter (exact match)', async () => {
      model.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRecord]),
      } as any);

      await repository.findAll({ format: RecordFormat.VINYL });

      expect(model.find).toHaveBeenCalledWith({ format: RecordFormat.VINYL });
    });

    it('should build query with q parameter using $or', async () => {
      model.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRecord]),
      } as any);

      await repository.findAll({ q: 'Beatles' });

      const calledQuery = (model.find as jest.Mock).mock.calls[0][0] as any;
      expect(calledQuery.$or).toBeDefined();
      expect(calledQuery.$or).toHaveLength(3);
    });

    it('should combine multiple filters', async () => {
      model.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRecord]),
      } as any);

      await repository.findAll({
        artist: 'Beatles',
        category: RecordCategory.ROCK,
        format: RecordFormat.VINYL,
      });

      const calledQuery = (model.find as jest.Mock).mock.calls[0][0] as any;
      expect(calledQuery.artist).toBeInstanceOf(RegExp);
      expect(calledQuery.category).toBe(RecordCategory.ROCK);
      expect(calledQuery.format).toBe(RecordFormat.VINYL);
    });
  });

  describe('updateById', () => {
    it('should update and return the record', async () => {
      const updatedRecord = { ...mockRecord, price: 30 };
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedRecord),
      } as any);

      const result = await repository.updateById('507f1f77bcf86cd799439011', {
        price: 30,
      });

      expect(result).toEqual(updatedRecord);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { price: 30 },
        { new: true },
      );
    });

    it('should return null when record not found', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.updateById('nonexistent', { price: 30 });

      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should delete and return the record', async () => {
      model.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRecord),
      } as any);

      const result = await repository.updateById('507f1f77bcf86cd799439011', { deletedAt: new Date() });

      expect(result).toEqual(mockRecord);
      expect(model.findByIdAndDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should return null when record not found', async () => {
      model.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.updateById('nonexistent', { deletedAt: new Date() });

      expect(result).toBeNull();
    });
  });

  describe('decrementStockIfAvailable', () => {
    it('should decrement stock when sufficient quantity', async () => {
      const updatedRecord = { ...mockRecord, qty: 5 };
      model.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedRecord),
      } as any);

      const result = await repository.decrementStockIfAvailable(
        '507f1f77bcf86cd799439011',
        5,
      );

      expect(result?.qty).toBe(5);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011', qty: { $gte: 5 } },
        { $inc: { qty: -5 } },
        { new: true },
      );
    });

    it('should return null when insufficient stock', async () => {
      model.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.decrementStockIfAvailable(
        '507f1f77bcf86cd799439011',
        100,
      );

      expect(result).toBeNull();
    });
  });

  describe('incrementStock', () => {
    it('should increment stock', async () => {
      const updatedRecord = { ...mockRecord, qty: 15 };
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedRecord),
      } as any);

      const result = await repository.incrementStock(
        '507f1f77bcf86cd799439011',
        5,
      );

      expect(result?.qty).toBe(15);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { $inc: { qty: 5 } },
        { new: true },
      );
    });
  });
});
