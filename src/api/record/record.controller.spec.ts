import { Test, TestingModule } from '@nestjs/testing';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { CreateRecordRequestDTO } from './dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from './dtos/update-record.request.dto';
import { RecordCategory, RecordFormat } from './record.enum';
import { NotFoundException } from '@nestjs/common';

describe('RecordController', () => {
  let controller: RecordController;
  let service: jest.Mocked<RecordService>;

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
    const mockRecordService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordController],
      providers: [
        {
          provide: RecordService,
          useValue: mockRecordService,
        },
      ],
    }).compile();

    controller = module.get<RecordController>(RecordController);
    service = module.get(RecordService);
  });

  describe('create', () => {
    it('should create a new record', async () => {
      const dto: CreateRecordRequestDTO = {
        artist: 'The Beatles',
        album: 'Abbey Road',
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      service.create.mockResolvedValue(mockRecord as any);

      const result = await controller.create(dto);

      expect(result).toEqual(mockRecord);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should create a record with MBID', async () => {
      const dto: CreateRecordRequestDTO = {
        artist: 'The Beatles',
        album: 'Abbey Road',
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
        mbid: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
      };

      const recordWithTracklist = {
        ...mockRecord,
        mbid: dto.mbid,
        tracklist: [{ position: 1, title: 'Come Together', length: 259000 }],
      };

      service.create.mockResolvedValue(recordWithTracklist as any);

      const result = await controller.create(dto);

      expect(result.tracklist).toHaveLength(1);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of records', async () => {
      const records = [
        mockRecord,
        { ...mockRecord, _id: '2', album: 'Let It Be' },
      ];
      service.findAll.mockResolvedValue(records as any);

      const result = await controller.findAll();

      expect(result).toEqual(records);
      expect(service.findAll).toHaveBeenCalledWith({
        q: undefined,
        artist: undefined,
        album: undefined,
        format: undefined,
        category: undefined,
      });
    });

    it('should filter records by artist', async () => {
      service.findAll.mockResolvedValue([mockRecord] as any);

      const result = await controller.findAll(undefined, 'Beatles');

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith({
        q: undefined,
        artist: 'Beatles',
        album: undefined,
        format: undefined,
        category: undefined,
      });
    });

    it('should filter records by category', async () => {
      service.findAll.mockResolvedValue([mockRecord] as any);

      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        RecordCategory.ROCK,
      );

      expect(service.findAll).toHaveBeenCalledWith({
        q: undefined,
        artist: undefined,
        album: undefined,
        format: undefined,
        category: RecordCategory.ROCK,
      });
    });

    it('should search records with q parameter', async () => {
      service.findAll.mockResolvedValue([mockRecord] as any);

      await controller.findAll('Beatles');

      expect(service.findAll).toHaveBeenCalledWith({
        q: 'Beatles',
        artist: undefined,
        album: undefined,
        format: undefined,
        category: undefined,
      });
    });
  });

  describe('findById', () => {
    it('should return a record by id', async () => {
      service.findById.mockResolvedValue(mockRecord as any);

      const result = await controller.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockRecord);
      expect(service.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException when record not found', async () => {
      service.findById.mockRejectedValue(
        new NotFoundException('Record not found'),
      );

      await expect(controller.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a record', async () => {
      const dto: UpdateRecordRequestDTO = { price: 30 };
      const updatedRecord = { ...mockRecord, price: 30 };
      service.update.mockResolvedValue(updatedRecord as any);

      const result = await controller.update('507f1f77bcf86cd799439011', dto);

      expect(result.price).toBe(30);
      expect(service.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        dto,
      );
    });

    it('should throw NotFoundException when updating non-existent record', async () => {
      const dto: UpdateRecordRequestDTO = { price: 30 };
      service.update.mockRejectedValue(
        new NotFoundException('Record not found'),
      );

      await expect(controller.update('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      service.delete.mockResolvedValue(mockRecord as any);

      const result = await controller.delete('507f1f77bcf86cd799439011');

      expect(result).toBeUndefined();
      expect(service.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException when deleting non-existent record', async () => {
      service.delete.mockRejectedValue(
        new NotFoundException('Record not found'),
      );

      await expect(controller.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
