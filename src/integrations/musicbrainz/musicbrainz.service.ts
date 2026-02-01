import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';

const MUSICBRAINZ_CONFIG = {
  BASE_URL: 'https://musicbrainz.org/ws/2',
  USER_AGENT: 'BrokenRecordStoreAPI/1.0.0 (contact@example.com)',
  CONTENT_TYPE: 'application/xml',
  RELEASE_INCLUDES: 'recordings+artist-credits+media',
} as const;

const XML_PARSER_CONFIG = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
} as const;

const DEFAULT_TRACK_TITLE = 'Unknown Track';
const PARSE_INT_RADIX = 10;

export interface Track {
  position: number;
  title: string;
  length?: number;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  artist: string;
  tracklist: Track[];
}

@Injectable()
export class MusicBrainzService {
  private readonly logger = new Logger(MusicBrainzService.name);
  private readonly xmlParser: XMLParser;

  constructor(private readonly httpService: HttpService) {
    this.xmlParser = new XMLParser(XML_PARSER_CONFIG);
  }

  async getRelease(mbid: string): Promise<MusicBrainzRelease | null> {
    try {
      const url = `${MUSICBRAINZ_CONFIG.BASE_URL}/release/${mbid}?inc=${MUSICBRAINZ_CONFIG.RELEASE_INCLUDES}`;
      this.logger.debug(`Fetching release from MusicBrainz: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Accept: MUSICBRAINZ_CONFIG.CONTENT_TYPE,
            'User-Agent': MUSICBRAINZ_CONFIG.USER_AGENT,
          },
        }),
      );

      return this.mapReleaseResponse(this.xmlParser.parse(response.data), mbid);
    } catch (error) {
      return this.handleFetchError(error, mbid);
    }
  }

  private handleFetchError(error: any, mbid: string): null {
    if (error.response?.status === HttpStatus.NOT_FOUND) {
      this.logger.warn(`MBID not found: ${mbid}`);
      return null;
    }
    this.logger.error(
      `Failed to fetch release from MusicBrainz: ${error.message}`,
    );
    throw error;
  }

  private mapReleaseResponse(
    parsed: any,
    mbid: string,
  ): MusicBrainzRelease | null {
    const release = parsed?.metadata?.release;
    if (!release) {
      this.logger.warn(`Invalid response structure for MBID: ${mbid}`);
      return null;
    }

    return {
      id: mbid,
      title: release.title || '',
      artist: this.extractArtist(release),
      tracklist: this.extractTracklist(release),
    };
  }

  private extractArtist(release: any): string {
    const nameCredit = release['artist-credit']?.['name-credit'];
    if (!nameCredit) return '';

    if (Array.isArray(nameCredit)) {
      return nameCredit.map((nc) => nc.artist?.name || '').join(', ');
    }
    return nameCredit.artist?.name || '';
  }

  private extractTracklist(release: any): Track[] {
    const mediumList = release['medium-list'];
    if (!mediumList) return [];

    const mediums = Array.isArray(mediumList.medium)
      ? mediumList.medium
      : [mediumList.medium];
    const tracks: Track[] = [];

    for (const medium of mediums) {
      const trackList = medium?.['track-list']?.track;
      if (!trackList) continue;

      const trackArray = Array.isArray(trackList) ? trackList : [trackList];

      for (const track of trackArray) {
        const recording = track.recording;
        if (!recording) continue;

        tracks.push({
          position:
            parseInt(track.position, PARSE_INT_RADIX) || tracks.length + 1,
          title: recording.title || DEFAULT_TRACK_TITLE,
          length: recording.length
            ? parseInt(recording.length, PARSE_INT_RADIX)
            : undefined,
        });
      }
    }

    return tracks;
  }
}
