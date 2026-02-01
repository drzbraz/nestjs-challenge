import { IsNotEmpty, IsNumber, Min, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderRequestDTO {
  @ApiProperty({
    description: 'Record ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId({ message: 'recordId must be a valid MongoDB ObjectId' })
  recordId: string;

  @ApiProperty({
    description: 'Quantity of the order',
    type: Number,
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
