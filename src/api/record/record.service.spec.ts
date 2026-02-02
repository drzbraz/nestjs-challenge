import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { RecordRepository } from './record.repository';
import { MusicBrainzService } from '../../integrations/musicbrainz/musicbrainz.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RecordCategory, RecordFormat } from './record.enum';
import { MongoErrorCode } from '../../common/constants/error-codes.constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Record } from './record.schema';
import { Cache } from 'cache-manager';
describe('RecordService', () => {
  let service: RecordService;
  let repository: jest.Mocked<RecordRepository>;
  let musicBrainzService: jest.Mocked<MusicBrainzService>;
  let cacheManager: jest.Mocked<Cache>;
  let cacheKey: string;
  let cachedResult: { data: Record[], total: number, limit: number, offset: number };

  const mockRecord = {
    _id: '507f1f77bcf86cd799439011',
    artist: 'The Beatles',
    album: 'Abbey Road',
    price: 25,
    qty: 10,
    format: RecordFormat.VINYL,
    category: RecordCategory.ROCK,
    mbid: undefined,
    tracklist: [],
  };

  const mockTracklist = [
    { position: 1, title: 'Come Together', length: 259000 },
    { position: 2, title: 'Something', length: 182000 },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      decrementStockIfAvailable: jest.fn(),
      incrementStock: jest.fn(),
    };

    const mockMusicBrainzService = {
      getRelease: jest.fn(),
    };

    const cacheManagerMock: jest.Mocked<Cache> = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    } as any;


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        { provide: RecordRepository, useValue: mockRepository },
        { provide: MusicBrainzService, useValue: mockMusicBrainzService },
        { provide: CACHE_MANAGER, useValue: cacheManagerMock },
      ],
    }).compile();

    service = module.get<RecordService>(RecordService);
    repository = module.get(RecordRepository);
    musicBrainzService = module.get(MusicBrainzService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('create', () => {
    const createDto = {
      artist: 'The Beatles',
      album: 'Abbey Road',
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    it('should create a record without MBID', async () => {
      repository.create.mockResolvedValue(mockRecord as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRecord);
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        mbid: undefined,
        tracklist: [],
      });
      expect(musicBrainzService.getRelease).not.toHaveBeenCalled();
    });

    it('should create a record with MBID and fetch tracklist', async () => {
      const mbid = 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d';
      const dtoWithMbid = { ...createDto, mbid };
      const recordWithTracklist = {
        ...mockRecord,
        mbid,
        tracklist: mockTracklist,
      };

      musicBrainzService.getRelease.mockResolvedValue({
        id: mbid,
        title: 'Abbey Road',
        artist: 'The Beatles',
        tracklist: mockTracklist,
      });
      repository.create.mockResolvedValue(recordWithTracklist as any);

      const result = await service.create(dtoWithMbid);

      expect(result.tracklist).toEqual(mockTracklist);
      expect(musicBrainzService.getRelease).toHaveBeenCalledWith(mbid);
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        mbid,
        tracklist: mockTracklist,
      });
    });

    it('should create a record with empty tracklist when MBID not found', async () => {
      const mbid = 'invalid-mbid-0000-0000-000000000000';
      const dtoWithMbid = { ...createDto, mbid };

      musicBrainzService.getRelease.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockRecord,
        mbid,
        tracklist: [],
      } as any);

      const result = await service.create(dtoWithMbid);

      expect(result.tracklist).toEqual([]);
      expect(musicBrainzService.getRelease).toHaveBeenCalledWith(mbid);
    });

    it('should throw ConflictException on duplicate key error', async () => {
      const duplicateError = { code: MongoErrorCode.DUPLICATE_KEY };
      repository.create.mockRejectedValue(duplicateError);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rethrow non-duplicate errors', async () => {
      const genericError = new Error('Database connection failed');
      repository.create.mockRejectedValue(genericError);

      await expect(service.create(createDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findAll', () => {
    const mockRecord = {
      _id: '507f1f77bcf86cd799439011',
      artist: 'The Beatles',
      album: 'Abbey Road',
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
      mbid: undefined,
      tracklist: [],
    } as any;

    beforeEach(() => {
      cacheKey = `records:${JSON.stringify({})}`;
      cachedResult = { data: [mockRecord], total: 1, limit: 20, offset: 0 };
      (cacheManager as jest.Mocked<Cache>).get.mockResolvedValue(cachedResult);
      (cacheManager as jest.Mocked<Cache>).set.mockResolvedValue(undefined);
    });

    it('should return all records without filters', async () => {
      const result = await service.findAll({});

      expect(result).toEqual(cachedResult);
      expect((cacheManager as jest.Mocked<Cache>).get).toHaveBeenCalledWith(cacheKey);
    });

    it('should pass filters to repository', async () => {
      const filter = { artist: 'Beatles', category: RecordCategory.ROCK };
      const cacheKey = `records:${JSON.stringify(filter)}`;
      await service.findAll(filter);

      expect((cacheManager as jest.Mocked<Cache>).get).toHaveBeenCalledWith(cacheKey);
    });

    it('should cache results', async () => {
      const filter = { artist: 'Pink Floyd', category: RecordCategory.ROCK };
      const cacheKey = `records:${JSON.stringify(filter)}`;
      const cachedResult = null as any;

      (cacheManager as jest.Mocked<Cache>).get.mockResolvedValue(cachedResult);


      repository.findAll.mockResolvedValue({ data: [
        {
          _id: '507f1f77bcf86cd799439011',
          artist: 'Pink Floyd',
          album: 'The Dark Side of the Moon',
          price: 25,
          qty: 10,
          format: RecordFormat.VINYL,
          category: RecordCategory.ROCK,
        },
      ], total: 1, limit: 20, offset: 0 } as any);

      const result = await service.findAll(filter);

      expect((cacheManager as jest.Mocked<Cache>).set).toHaveBeenCalledWith(cacheKey, { data: [
        {
          _id: '507f1f77bcf86cd799439011',
          artist: 'Pink Floyd',
          album: 'The Dark Side of the Moon',
          price: 25,
          qty: 10,
          format: RecordFormat.VINYL,
          category: RecordCategory.ROCK,
        },
      ], total: 1, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [
        {
          _id: '507f1f77bcf86cd799439011',
          artist: 'Pink Floyd',
          album: 'The Dark Side of the Moon',
          price: 25,
          qty: 10,
          format: RecordFormat.VINYL,
          category: RecordCategory.ROCK,
        },
      ], total: 1, limit: 20, offset: 0 });

    });
  });

  describe('findById', () => {
    it('should return a record by id', async () => {
      repository.findById.mockResolvedValue(mockRecord as any);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockRecord);
    });

    it('should throw NotFoundException when record not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a record', async () => {
      const updateDto = { price: 30 };
      const updatedRecord = { ...mockRecord, price: 30 };

      repository.findById.mockResolvedValue(mockRecord as any);
      repository.updateById.mockResolvedValue(updatedRecord as any);

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(result.price).toBe(30);
      expect(repository.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
    });

    it('should throw NotFoundException when record not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { price: 30 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fetch new tracklist when MBID changes', async () => {
      const oldMbid = 'old-mbid-0000-0000-000000000000';
      const newMbid = 'new-mbid-0000-0000-000000000000';
      const existingRecord = { ...mockRecord, mbid: oldMbid };
      const updateDto = { mbid: newMbid };

      repository.findById.mockResolvedValue(existingRecord as any);
      musicBrainzService.getRelease.mockResolvedValue({
        id: newMbid,
        title: 'Abbey Road',
        artist: 'The Beatles',
        tracklist: mockTracklist,
      });
      repository.updateById.mockResolvedValue({
        ...existingRecord,
        mbid: newMbid,
        tracklist: mockTracklist,
      } as any);

      await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(musicBrainzService.getRelease).toHaveBeenCalledWith(newMbid);
      expect(repository.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          mbid: newMbid,
          tracklist: mockTracklist,
        },
      );
    });

    it('should not fetch tracklist when MBID is the same', async () => {
      const mbid = 'same-mbid-0000-0000-000000000000';
      const existingRecord = { ...mockRecord, mbid, tracklist: mockTracklist };
      const updateDto = { mbid, price: 30 };

      repository.findById.mockResolvedValue(existingRecord as any);
      repository.updateById.mockResolvedValue({
        ...existingRecord,
        price: 30,
      } as any);

      await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(musicBrainzService.getRelease).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate key during update', async () => {
      const updateDto = { artist: 'Duplicate Artist' };
      const duplicateError = { code: MongoErrorCode.DUPLICATE_KEY };

      repository.findById.mockResolvedValue(mockRecord as any);
      repository.updateById.mockRejectedValue(duplicateError);

      await expect(
        service.update('507f1f77bcf86cd799439011', updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      repository.updateById.mockResolvedValue(mockRecord as any);

      await service.delete('507f1f77bcf86cd799439011');

      expect(repository.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { deletedAt: new Date() },
      );
    });

    it('should throw NotFoundException when record not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('decrementStockIfAvailable', () => {
    it('should decrement stock when available', async () => {
      const updatedRecord = { ...mockRecord, qty: 5 };
      repository.decrementStockIfAvailable.mockResolvedValue(
        updatedRecord as any,
      );

      const result = await service.decrementStockIfAvailable(
        '507f1f77bcf86cd799439011',
        5,
      );

      expect(result?.qty).toBe(5);
      expect(repository.decrementStockIfAvailable).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        5,
      );
    });

    it('should return null when insufficient stock', async () => {
      repository.decrementStockIfAvailable.mockResolvedValue(null);

      const result = await service.decrementStockIfAvailable(
        '507f1f77bcf86cd799439011',
        100,
      );

      expect(result).toBeNull();
    });
  });

  describe('incrementStock', () => {
    it('should increment stock', async () => {
      const updatedRecord = { ...mockRecord, qty: 15 };
      repository.incrementStock.mockResolvedValue(updatedRecord as any);

      const result = await service.incrementStock(
        '507f1f77bcf86cd799439011',
        5,
      );

      expect(result?.qty).toBe(15);
      expect(repository.incrementStock).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        5,
      );
    });
  });
});
