import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('OrderController', () => {
  let controller: OrderController;
  let service: jest.Mocked<OrderService>;

  const mockOrder = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    recordId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    quantity: 2,
    price: 25,
  };

  beforeEach(async () => {
    const mockOrderService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get(OrderService);
  });

  describe('create', () => {
    const createDto = {
      recordId: '507f1f77bcf86cd799439011',
      quantity: 2,
    };

    it('should create an order', async () => {
      service.create.mockResolvedValue(mockOrder as any);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate ConflictException for insufficient stock', async () => {
      service.create.mockRejectedValue(
        new ConflictException('Insufficient stock'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
