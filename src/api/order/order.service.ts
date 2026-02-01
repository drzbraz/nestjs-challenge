import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Order } from './order.schema';
import { RecordService } from '../record/record.service';
import { OrderRepository } from './order.repository';
import { CreateOrderRequestDTO } from './dtos/create-order.request.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly recordService: RecordService,
  ) {}

  async create(dto: CreateOrderRequestDTO): Promise<Order> {
    const updatedRecord = await this.recordService.decrementStockIfAvailable(
      dto.recordId,
      dto.quantity,
    );

    if (!updatedRecord) {
      throw new ConflictException('Insufficient stock');
    }

    try {
      return await this.orderRepository.create({
        recordId: updatedRecord._id as Types.ObjectId,
        quantity: dto.quantity,
        price: updatedRecord.price,
      });
    } catch (error) {
      this.logger.error(
        `Order creation failed, rolling back stock: ${error.message}`,
      );
      await this.recordService.incrementStock(
        updatedRecord._id as string,
        dto.quantity,
      );
      throw error;
    }
  }
}
