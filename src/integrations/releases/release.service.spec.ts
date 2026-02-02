import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ReleaseService } from './release.service';
import { HttpStatus } from '@nestjs/common';
import { MusicBrainzProvider } from '../providers/musicbrainz.provider';

describe('ReleaseService', () => {
  let service: ReleaseService;
  let provider: jest.Mocked<MusicBrainzProvider>;

  const validMbid = 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d';

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockMusicBrainzProvider = {
      getRelease: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseService,
        { provide: MusicBrainzProvider, useValue: mockMusicBrainzProvider },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<ReleaseService>(ReleaseService);
    provider = module.get(MusicBrainzProvider);
  });

  describe('getRelease', () => {
    it('should fetch and parse release data successfully', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Abbey Road',
        artist: 'The Beatles',
        tracklist: [
          { position: 1, title: 'Come Together', length: 259000 },
          { position: 2, title: 'Something', length: 182000 },
        ],
      });

      const result = await service.getRelease(validMbid);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(validMbid);
      expect(result?.title).toBe('Abbey Road');
      expect(result?.artist).toBe('The Beatles');
      expect(result?.tracklist).toHaveLength(2);
    });

    it('should extract tracklist with position, title, and length', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Abbey Road',
        artist: 'The Beatles',
        tracklist: [
          { position: 1, title: 'Come Together', length: 259000 },
          { position: 2, title: 'Something', length: 182000 },
        ],
      });

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
      provider.getRelease.mockResolvedValue(null);

      const result = await service.getRelease(validMbid);

      expect(result).toBeNull();
    });

    it('should throw error for non-404 HTTP errors', async () => {
      const error = new Error('Server Error');
      (error as any).response = { status: HttpStatus.INTERNAL_SERVER_ERROR };
      provider.getRelease.mockRejectedValue(error);

      await expect(service.getRelease(validMbid)).rejects.toThrow(
        'Server Error',
      );
    });

    it('should return null for invalid XML structure', async () => {
      provider.getRelease.mockResolvedValue(null);

      const result = await service.getRelease(validMbid);

      expect(result).toBeNull();
    });

    it('should call MusicBrainz API with correct URL and headers', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Abbey Road',
        artist: 'The Beatles',
        tracklist: [
          { position: 1, title: 'Come Together', length: 259000 },
          { position: 2, title: 'Something', length: 182000 },
        ],
      });

      await service.getRelease(validMbid);

      expect(provider.getRelease).toHaveBeenCalledWith(validMbid);
    });

    it('should include inc parameters in URL', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Abbey Road',
        artist: 'The Beatles',
        tracklist: [
          { position: 1, title: 'Come Together', length: 259000 },
          { position: 2, title: 'Something', length: 182000 },
        ],
      });

      await service.getRelease(validMbid);

      expect(provider.getRelease).toHaveBeenCalledWith(validMbid);
    });

    it('should handle multiple artists', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Collaboration Album',
        artist: 'Artist One, Artist Two',
        tracklist: [{ position: 1, title: 'Track 1', length: 259000 }],
      });

      const result = await service.getRelease(validMbid);

      expect(result?.artist).toBe('Artist One, Artist Two');
    });

    it('should handle release with no tracklist', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Empty Album',
        artist: 'Test Artist',
        tracklist: [],
      });

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist).toEqual([]);
    });

    it('should handle track without length', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Test Album',
        artist: 'Test Artist',
        tracklist: [
          { position: 1, title: 'Track Without Length', length: undefined },
        ],
      });

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist[0].length).toBeUndefined();
    });

    it('should handle multiple mediums (CDs)', async () => {
      provider.getRelease.mockResolvedValue({
        id: validMbid,
        title: 'Double Album',
        artist: 'Test Artist',
        tracklist: [
          { position: 1, title: 'CD1 Track 1', length: 259000 },
          { position: 1, title: 'CD2 Track 1', length: 259000 },
        ],
      });

      const result = await service.getRelease(validMbid);

      expect(result?.tracklist).toHaveLength(2);
      expect(result?.tracklist[0].title).toBe('CD1 Track 1');
      expect(result?.tracklist[1].title).toBe('CD2 Track 1');
    });
  });
});
