import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { MusicBrainzService } from './musicbrainz.service';
import { of, throwError } from 'rxjs';
import { HttpStatus } from '@nestjs/common';
import { AxiosResponse, AxiosHeaders } from 'axios';

describe('MusicBrainzService', () => {
  let service: MusicBrainzService;
  let httpService: jest.Mocked<HttpService>;

  const validMbid = 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d';

  const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
      <release id="${validMbid}">
        <title>Abbey Road</title>
        <artist-credit>
          <name-credit>
            <artist>
              <name>The Beatles</name>
            </artist>
          </name-credit>
        </artist-credit>
        <medium-list>
          <medium>
            <track-list>
              <track>
                <position>1</position>
                <recording>
                  <title>Come Together</title>
                  <length>259000</length>
                </recording>
              </track>
              <track>
                <position>2</position>
                <recording>
                  <title>Something</title>
                  <length>182000</length>
                </recording>
              </track>
            </track-list>
          </medium>
        </medium-list>
      </release>
    </metadata>`;

  const mockAxiosResponse = (data: string): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MusicBrainzService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<MusicBrainzService>(MusicBrainzService);
    httpService = module.get(HttpService);
  });

  describe('getRelease', () => {
    it('should fetch and parse release data successfully', async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockXmlResponse)));

      const result = await service.getRelease(validMbid);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(validMbid);
      expect(result?.title).toBe('Abbey Road');
      expect(result?.artist).toBe('The Beatles');
      expect(result?.tracklist).toHaveLength(2);
    });

    it('should extract tracklist with position, title, and length', async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockXmlResponse)));

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist[0]).toEqual({
        position: 1,
        title: 'Come Together',
        length: 259000,
      });
      expect(result?.tracklist[1]).toEqual({
        position: 2,
        title: 'Something',
        length: 182000,
      });
    });

    it('should return null when MBID not found (404)', async () => {
      const error = {
        response: { status: HttpStatus.NOT_FOUND },
        message: 'Not Found',
      };
      httpService.get.mockReturnValue(throwError(() => error));

      const result = await service.getRelease('invalid-mbid');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 HTTP errors', async () => {
      const error = new Error('Server Error');
      (error as any).response = { status: HttpStatus.INTERNAL_SERVER_ERROR };
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getRelease(validMbid)).rejects.toThrow(
        'Server Error',
      );
    });

    it('should return null for invalid XML structure', async () => {
      const invalidXml = `<?xml version="1.0"?><metadata></metadata>`;
      httpService.get.mockReturnValue(of(mockAxiosResponse(invalidXml)));

      const result = await service.getRelease(validMbid);

      expect(result).toBeNull();
    });

    it('should call MusicBrainz API with correct URL and headers', async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockXmlResponse)));

      await service.getRelease(validMbid);

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining(`/release/${validMbid}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/xml',
            'User-Agent': expect.stringContaining('BrokenRecordStoreAPI'),
          }),
        }),
      );
    });

    it('should include inc parameters in URL', async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockXmlResponse)));

      await service.getRelease(validMbid);

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('inc=recordings+artist-credits+media'),
        expect.any(Object),
      );
    });

    it('should handle multiple artists', async () => {
      const multiArtistXml = `<?xml version="1.0"?>
        <metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
          <release id="${validMbid}">
            <title>Collaboration Album</title>
            <artist-credit>
              <name-credit>
                <artist><name>Artist One</name></artist>
              </name-credit>
              <name-credit>
                <artist><name>Artist Two</name></artist>
              </name-credit>
            </artist-credit>
            <medium-list>
              <medium>
                <track-list>
                  <track>
                    <position>1</position>
                    <recording><title>Track 1</title></recording>
                  </track>
                </track-list>
              </medium>
            </medium-list>
          </release>
        </metadata>`;

      httpService.get.mockReturnValue(of(mockAxiosResponse(multiArtistXml)));

      const result = await service.getRelease(validMbid);

      expect(result?.artist).toBe('Artist One, Artist Two');
    });

    it('should handle release with no tracklist', async () => {
      const noTracklistXml = `<?xml version="1.0"?>
        <metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
          <release id="${validMbid}">
            <title>Empty Album</title>
            <artist-credit>
              <name-credit>
                <artist><name>Test Artist</name></artist>
              </name-credit>
            </artist-credit>
          </release>
        </metadata>`;

      httpService.get.mockReturnValue(of(mockAxiosResponse(noTracklistXml)));

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist).toEqual([]);
    });

    it('should handle track without length', async () => {
      const noLengthXml = `<?xml version="1.0"?>
        <metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
          <release id="${validMbid}">
            <title>Test Album</title>
            <artist-credit>
              <name-credit>
                <artist><name>Test Artist</name></artist>
              </name-credit>
            </artist-credit>
            <medium-list>
              <medium>
                <track-list>
                  <track>
                    <position>1</position>
                    <recording><title>Track Without Length</title></recording>
                  </track>
                </track-list>
              </medium>
            </medium-list>
          </release>
        </metadata>`;

      httpService.get.mockReturnValue(of(mockAxiosResponse(noLengthXml)));

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist[0].length).toBeUndefined();
    });

    it('should handle multiple mediums (CDs)', async () => {
      const multiMediumXml = `<?xml version="1.0"?>
        <metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
          <release id="${validMbid}">
            <title>Double Album</title>
            <artist-credit>
              <name-credit>
                <artist><name>Test Artist</name></artist>
              </name-credit>
            </artist-credit>
            <medium-list>
              <medium>
                <track-list>
                  <track>
                    <position>1</position>
                    <recording><title>CD1 Track 1</title></recording>
                  </track>
                </track-list>
              </medium>
              <medium>
                <track-list>
                  <track>
                    <position>1</position>
                    <recording><title>CD2 Track 1</title></recording>
                  </track>
                </track-list>
              </medium>
            </medium-list>
          </release>
        </metadata>`;

      httpService.get.mockReturnValue(of(mockAxiosResponse(multiMediumXml)));

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist).toHaveLength(2);
      expect(result?.tracklist[0].title).toBe('CD1 Track 1');
      expect(result?.tracklist[1].title).toBe('CD2 Track 1');
    });
  });
});
