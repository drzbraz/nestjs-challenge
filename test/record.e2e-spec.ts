import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RecordFormat, RecordCategory } from '../src/api/record/record.enum';

describe('RecordController (e2e)', () => {
  let app: INestApplication;
  let recordModel;
  const createdRecordIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    recordModel = app.get('RecordModel');
    await app.init();
  });

  afterEach(async () => {
    for (const id of createdRecordIds) {
      await recordModel.findByIdAndDelete(id).catch(() => {});
    }
    createdRecordIds.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /records', () => {
    it('should create a new record', async () => {
      const createRecordDto = {
        artist: 'The Beatles',
        album: `Abbey Road ${Date.now()}`,
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      const response = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      createdRecordIds.push(response.body._id);

      expect(response.body).toHaveProperty('artist', createRecordDto.artist);
      expect(response.body).toHaveProperty('album', createRecordDto.album);
      expect(response.body).toHaveProperty('price', createRecordDto.price);
      expect(response.body).toHaveProperty('qty', createRecordDto.qty);
      expect(response.body).toHaveProperty('format', createRecordDto.format);
      expect(response.body).toHaveProperty(
        'category',
        createRecordDto.category,
      );
    });

    it('should return 400 for invalid data', async () => {
      const invalidDto = {
        artist: 'The Beatles',
      };

      await request(app.getHttpServer())
        .post('/records')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 409 for duplicate record (same artist+album+format)', async () => {
      const uniqueAlbum = `Duplicate Test ${Date.now()}`;
      const createRecordDto = {
        artist: 'Duplicate Artist',
        album: uniqueAlbum,
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      const first = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      createdRecordIds.push(first.body._id);

      await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(409);
    });
  });

  describe('GET /records', () => {
    it('should return an array of records', async () => {
      const response = await request(app.getHttpServer())
        .get('/records')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter records by artist', async () => {
      const uniqueArtist = `Filter Test Artist ${Date.now()}`;
      const createRecordDto = {
        artist: uniqueArtist,
        album: 'Filter Test Album',
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      const created = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      createdRecordIds.push(created.body._id);

      const response = await request(app.getHttpServer())
        .get(`/records?artist=${encodeURIComponent(uniqueArtist)}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0]).toHaveProperty('artist', uniqueArtist);
    });

    it('should filter records by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/records?category=${RecordCategory.ROCK}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((record: any) => {
        expect(record.category).toBe(RecordCategory.ROCK);
      });
    });

    it('should search records with q parameter', async () => {
      const uniqueAlbum = `SearchTest ${Date.now()}`;
      const createRecordDto = {
        artist: 'Search Artist',
        album: uniqueAlbum,
        price: 25,
        qty: 10,
        format: RecordFormat.CD,
        category: RecordCategory.JAZZ,
      };

      const created = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      createdRecordIds.push(created.body._id);

      const response = await request(app.getHttpServer())
        .get(`/records?q=${uniqueAlbum}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /records/:id', () => {
    it('should return a record by id', async () => {
      const createRecordDto = {
        artist: 'GetById Artist',
        album: `GetById Album ${Date.now()}`,
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      const created = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      createdRecordIds.push(created.body._id);

      const response = await request(app.getHttpServer())
        .get(`/records/${created.body._id}`)
        .expect(200);

      expect(response.body._id).toBe(created.body._id);
      expect(response.body.artist).toBe(createRecordDto.artist);
    });

    it('should return 404 for non-existent record', async () => {
      await request(app.getHttpServer())
        .get('/records/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('PUT /records/:id', () => {
    it('should update a record', async () => {
      const createRecordDto = {
        artist: 'Update Artist',
        album: `Update Album ${Date.now()}`,
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      const created = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      createdRecordIds.push(created.body._id);

      const updateDto = { price: 30 };

      const response = await request(app.getHttpServer())
        .put(`/records/${created.body._id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.price).toBe(30);
    });

    it('should return 404 for non-existent record', async () => {
      await request(app.getHttpServer())
        .put('/records/507f1f77bcf86cd799439011')
        .send({ price: 30 })
        .expect(404);
    });
  });

  describe('DELETE /records/:id', () => {
    it('should delete a record', async () => {
      const createRecordDto = {
        artist: 'Delete Artist',
        album: `Delete Album ${Date.now()}`,
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };

      const created = await request(app.getHttpServer())
        .post('/records')
        .send(createRecordDto)
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/records/${created.body._id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/records/${created.body._id}`)
        .expect(404);
    });

    it('should return 404 for non-existent record', async () => {
      await request(app.getHttpServer())
        .delete('/records/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });
});
