import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReleaseService } from './release.service';
import { MusicBrainzProvider } from '../providers/musicbrainz.provider';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
    }),
  ],
  providers: [ReleaseService, MusicBrainzProvider],
  exports: [ReleaseService],
})
export class ReleaseModule {}
