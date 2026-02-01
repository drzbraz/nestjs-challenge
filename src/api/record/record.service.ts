import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Record } from './record.schema';
import { RecordRepository, RecordFilter } from './record.repository';
import { CreateRecordRequestDTO } from './dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from './dtos/update-record.request.dto';
import {
  MusicBrainzRelease,
  MusicBrainzService,
} from '../../integrations/musicbrainz/musicbrainz.service';
import { MongoErrorCode } from '../../common/constants/error-codes.constants';

@Injectable()
export class RecordService {
  constructor(
    private readonly recordRepository: RecordRepository,
    private readonly musicBrainzService: MusicBrainzService,
  ) {}

  async create(dto: CreateRecordRequestDTO): Promise<Record> {
    const tracklist = await this.fetchTracklistIfMbidProvided(dto.mbid);

    try {
      return await this.recordRepository.create({
        artist: dto.artist,
        album: dto.album,
        price: dto.price,
        qty: dto.qty,
        format: dto.format,
        category: dto.category,
        mbid: dto.mbid,
        tracklist,
      });
    } catch (error) {
      this.handleDuplicateKeyError(error, dto.artist, dto.album, dto.format);
      throw error;
    }
  }

  async findAll(filter: RecordFilter): Promise<Record[]> {
    return await this.recordRepository.findAll(filter);
  }

  async findById(id: string): Promise<Record> {
    const record = await this.recordRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }
    return record;
  }

  async update(id: string, dto: UpdateRecordRequestDTO): Promise<Record> {
    const existingRecord = await this.recordRepository.findById(id);
    if (!existingRecord) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }

    const updateData: Partial<Record> = { ...dto };
    const isMbidChanged = dto.mbid && dto.mbid !== existingRecord.mbid;

    if (isMbidChanged) {
      updateData.tracklist = await this.fetchTracklistIfMbidProvided(dto.mbid);
    }

    try {
      const updatedRecord = await this.recordRepository.updateById(
        id,
        updateData,
      );
      if (!updatedRecord) {
        throw new NotFoundException(`Failed to update record with ID ${id}`);
      }
      return updatedRecord;
    } catch (error) {
      this.handleDuplicateKeyError(
        error,
        dto.artist ?? existingRecord.artist,
        dto.album ?? existingRecord.album,
        dto.format ?? existingRecord.format,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<Record> {
    const record = await this.recordRepository.deleteById(id);
    if (!record) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }
    return record;
  }

  async decrementStockIfAvailable(
    recordId: string,
    quantity: number,
  ): Promise<Record | null> {
    return await this.recordRepository.decrementStockIfAvailable(
      recordId,
      quantity,
    );
  }

  async incrementStock(
    recordId: string,
    quantity: number,
  ): Promise<Record | null> {
    return await this.recordRepository.incrementStock(recordId, quantity);
  }

  private async fetchTracklistIfMbidProvided(
    mbid?: string,
  ): Promise<MusicBrainzRelease['tracklist']> {
    if (!mbid) return [];
    const release = await this.musicBrainzService.getRelease(mbid);
    return release?.tracklist ?? [];
  }

  private handleDuplicateKeyError(
    error: any,
    artist: string,
    album: string,
    format: string,
  ): void {
    if (error.code === MongoErrorCode.DUPLICATE_KEY) {
      throw new ConflictException(
        `Record with artist "${artist}", album "${album}", and format "${format}" already exists`,
      );
    }
  }
}
