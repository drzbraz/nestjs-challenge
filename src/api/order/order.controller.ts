import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Order } from './order.schema';
import { OrderService } from './order.service';
import { CreateOrderRequestDTO } from './dtos/create-order.request.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  async create(@Body() dto: CreateOrderRequestDTO): Promise<Order> {
    return await this.orderService.create(dto);
  }
}
