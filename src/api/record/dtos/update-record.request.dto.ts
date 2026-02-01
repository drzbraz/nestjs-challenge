import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RecordFormat, RecordCategory } from '../record.enum';

export class UpdateRecordRequestDTO {
  @ApiProperty({
    description: 'Artist of the record',
    example: 'The Beatles',
    required: false,
  })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiProperty({
    description: 'Album name',
    example: 'Abbey Road',
    required: false,
  })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiProperty({
    description: 'Price of the record',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  price?: number;

  @ApiProperty({
    description: 'Quantity in stock',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qty?: number;

  @ApiProperty({
    description: 'Format (Vinyl, CD, etc.)',
    enum: RecordFormat,
    required: false,
  })
  @IsOptional()
  @IsEnum(RecordFormat)
  format?: RecordFormat;

  @ApiProperty({
    description: 'Category (Rock, Jazz, etc.)',
    enum: RecordCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(RecordCategory)
  category?: RecordCategory;

  @ApiProperty({
    description: 'MusicBrainz identifier (UUID)',
    example: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'mbid must be a valid UUID' })
  mbid?: string;
}
