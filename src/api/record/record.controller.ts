import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Record } from './record.schema';
import { RecordService } from './record.service';
import { CreateRecordRequestDTO } from './dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from './dtos/update-record.request.dto';
import { RecordCategory, RecordFormat } from './record.enum';

@Controller('records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new record' })
  @ApiResponse({ status: 201, description: 'Record successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'Record already exists' })
  async create(@Body() dto: CreateRecordRequestDTO): Promise<Record> {
    return this.recordService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all records with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'List of records',
    type: [Record],
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description:
      'Search query (search across multiple fields like artist, album, category, etc.)',
    type: String,
  })
  @ApiQuery({
    name: 'artist',
    required: false,
    description: 'Filter by artist name',
    type: String,
  })
  @ApiQuery({
    name: 'album',
    required: false,
    description: 'Filter by album name',
    type: String,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Filter by record format (Vinyl, CD, etc.)',
    enum: RecordFormat,
    type: String,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by record category (e.g., Rock, Jazz)',
    enum: RecordCategory,
    type: String,
  })
  async findAll(
    @Query('q') q?: string,
    @Query('artist') artist?: string,
    @Query('album') album?: string,
    @Query('format') format?: RecordFormat,
    @Query('category') category?: RecordCategory,
  ): Promise<Record[]> {
    return this.recordService.findAll({ q, artist, album, format, category });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a record by ID' })
  @ApiResponse({ status: 200, description: 'Record found' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async findById(@Param('id') id: string): Promise<Record> {
    return this.recordService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecordRequestDTO,
  ): Promise<Record> {
    return this.recordService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async delete(@Param('id') id: string): Promise<Record> {
    return this.recordService.delete(id);
  }
}
