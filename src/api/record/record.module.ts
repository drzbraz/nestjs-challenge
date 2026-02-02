import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { RecordRepository } from './record.repository';
import { MusicBrainzModule } from '../../integrations/musicbrainz/musicbrainz.module';
import { RecordSchema } from './record.schema';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Record', schema: RecordSchema }]),
    MusicBrainzModule,
    CacheModule.register({
      ttl: 60, 
      max: 100, 
    }),
  ],
  controllers: [RecordController],
  providers: [RecordService, RecordRepository],
  exports: [RecordService],
})
export class RecordModule {}
