import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MusicBrainzService } from './musicbrainz.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
    }),
  ],
  providers: [MusicBrainzService],
  exports: [MusicBrainzService],
})
export class MusicBrainzModule {}
