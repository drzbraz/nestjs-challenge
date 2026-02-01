import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { RecordService } from '../record/record.service';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RecordCategory, RecordFormat } from '../record/record.enum';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let recordService: jest.Mocked<RecordService>;

  const mockRecordId = new Types.ObjectId('507f1f77bcf86cd799439011');

  const mockRecord = {
    _id: mockRecordId,
    artist: 'The Beatles',
    album: 'Abbey Road',
    price: 25,
    qty: 10,
    format: RecordFormat.VINYL,
    category: RecordCategory.ROCK,
    tracklist: [],
  };

  const mockOrder = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    recordId: mockRecordId,
    quantity: 2,
    price: 25,
  };

  beforeEach(async () => {
    const mockOrderRepository = {
      create: jest.fn(),
    };

    const mockRecordService = {
      findById: jest.fn(),
      decrementStockIfAvailable: jest.fn(),
      incrementStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: RecordService, useValue: mockRecordService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(OrderRepository);
    recordService = module.get(RecordService);
  });

  describe('create', () => {
    const createDto = {
      recordId: mockRecordId.toString(),
      quantity: 2,
    };

    it('should create an order successfully', async () => {
      const updatedRecord = { ...mockRecord, qty: 8 };

      recordService.decrementStockIfAvailable.mockResolvedValue(
        updatedRecord as any,
      );
      orderRepository.create.mockResolvedValue(mockOrder as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockOrder);
      expect(recordService.decrementStockIfAvailable).toHaveBeenCalledWith(
        createDto.recordId,
        createDto.quantity,
      );
      expect(orderRepository.create).toHaveBeenCalledWith({
        recordId: mockRecordId,
        quantity: 2,
        price: 25,
      });
    });

    it('should throw ConflictException when insufficient stock', async () => {
      recordService.decrementStockIfAvailable.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(orderRepository.create).not.toHaveBeenCalled();
    });

    it('should rollback stock on order creation failure', async () => {
      const updatedRecord = { ...mockRecord, qty: 8 };

      recordService.decrementStockIfAvailable.mockResolvedValue(
        updatedRecord as any,
      );
      orderRepository.create.mockRejectedValue(new Error('Database error'));
      recordService.incrementStock.mockResolvedValue(mockRecord as any);

      await expect(service.create(createDto)).rejects.toThrow('Database error');
      expect(recordService.incrementStock).toHaveBeenCalledTimes(1);

      const [calledRecordId, calledQuantity] =
        recordService.incrementStock.mock.calls[0];
      expect(String(calledRecordId)).toMatch(/^[a-f0-9]{24}$/);
      expect(calledQuantity).toBe(createDto.quantity);
    });

    it('should capture price from record at order time', async () => {
      const recordWithHighPrice = { ...mockRecord, price: 100, qty: 8 };

      recordService.decrementStockIfAvailable.mockResolvedValue(
        recordWithHighPrice as any,
      );
      orderRepository.create.mockResolvedValue({
        ...mockOrder,
        price: 100,
      } as any);

      const result = await service.create(createDto);

      expect(result.price).toBe(100);
      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ price: 100 }),
      );
    });

    it('should handle order with quantity of 1', async () => {
      const singleItemDto = { recordId: mockRecordId.toString(), quantity: 1 };
      const updatedRecord = { ...mockRecord, qty: 9 };

      recordService.decrementStockIfAvailable.mockResolvedValue(
        updatedRecord as any,
      );
      orderRepository.create.mockResolvedValue({
        ...mockOrder,
        quantity: 1,
      } as any);

      const result = await service.create(singleItemDto);

      expect(result.quantity).toBe(1);
    });

    it('should handle edge case when all stock is ordered', async () => {
      const allStockDto = { recordId: mockRecordId.toString(), quantity: 10 };
      const emptyStockRecord = { ...mockRecord, qty: 0 };

      recordService.decrementStockIfAvailable.mockResolvedValue(
        emptyStockRecord as any,
      );
      orderRepository.create.mockResolvedValue({
        ...mockOrder,
        quantity: 10,
      } as any);

      const result = await service.create(allStockDto);

      expect(result.quantity).toBe(10);
    });
  });
});
