import {
  IsString,
  IsNotEmpty,
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

export class CreateRecordRequestDTO {
  @ApiProperty({ description: 'Artist of the record', example: 'The Beatles' })
  @IsNotEmpty()
  @IsString()
  artist: string;

  @ApiProperty({ description: 'Album name', example: 'Abbey Road' })
  @IsNotEmpty()
  @IsString()
  album: string;

  @ApiProperty({ description: 'Price of the record', example: 30 })
  @IsNumber()
  @Min(0)
  @Max(10000)
  price: number;

  @ApiProperty({ description: 'Quantity in stock', example: 10 })
  @IsInt()
  @Min(0)
  @Max(100)
  qty: number;

  @ApiProperty({ description: 'Format (Vinyl, CD, etc.)', enum: RecordFormat })
  @IsNotEmpty()
  @IsEnum(RecordFormat)
  format: RecordFormat;

  @ApiProperty({
    description: 'Category (Rock, Jazz, etc.)',
    enum: RecordCategory,
  })
  @IsNotEmpty()
  @IsEnum(RecordCategory)
  category: RecordCategory;

  @ApiProperty({
    description: 'MusicBrainz identifier (UUID)',
    example: 'cf0d899c-bbc6-4a33-ba74-5e335284e836',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'mbid must be a valid UUID' })
  mbid?: string;
}
