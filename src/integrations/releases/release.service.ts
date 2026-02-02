import { Injectable } from '@nestjs/common';
import { MusicBrainzProvider } from '../providers/musicbrainz.provider';

export interface Track {
  position: number;
  title: string;
  length?: number;
}

export interface Release {
  id: string;
  title: string;
  artist: string;
  tracklist: Track[];
}

@Injectable()
export class ReleaseService {
  constructor(private readonly provider: MusicBrainzProvider) {}

  async getRelease(mbid: string): Promise<Release | null> {
    return this.provider.getRelease(mbid);
  }
}
