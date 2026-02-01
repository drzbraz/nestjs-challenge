import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RecordFormat, RecordCategory } from '../src/api/record/record.enum';

describe('OrderController (e2e)', () => {
  let app: INestApplication;
  let recordModel;
  let orderModel;
  const createdRecordIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    recordModel = app.get('RecordModel');
    orderModel = app.get('OrderModel');
    await app.init();
  });

  afterEach(async () => {
    for (const id of createdOrderIds) {
      await orderModel.findByIdAndDelete(id).catch(() => {});
    }
    createdOrderIds.length = 0;

    for (const id of createdRecordIds) {
      await recordModel.findByIdAndDelete(id).catch(() => {});
    }
    createdRecordIds.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestRecord(qty = 10) {
    const createRecordDto = {
      artist: `Order Test Artist ${Date.now()}`,
      album: `Order Test Album ${Date.now()}`,
      price: 25,
      qty,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const response = await request(app.getHttpServer())
      .post('/records')
      .send(createRecordDto)
      .expect(201);

    createdRecordIds.push(response.body._id);
    return response.body;
  }

  describe('POST /orders', () => {
    it('should create an order successfully', async () => {
      const record = await createTestRecord(10);

      const createOrderDto = {
        recordId: record._id,
        quantity: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(201);

      createdOrderIds.push(response.body._id);

      expect(response.body).toHaveProperty('recordId', record._id);
      expect(response.body).toHaveProperty('quantity', 2);
      expect(response.body).toHaveProperty('price', 25);
    });

    it('should decrement stock after order', async () => {
      const record = await createTestRecord(10);

      const createOrderDto = {
        recordId: record._id,
        quantity: 3,
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(201);

      createdOrderIds.push(orderResponse.body._id);

      const recordResponse = await request(app.getHttpServer())
        .get(`/records/${record._id}`)
        .expect(200);

      expect(recordResponse.body.qty).toBe(7);
    });

    it('should return 409 for insufficient stock', async () => {
      const record = await createTestRecord(5);

      const createOrderDto = {
        recordId: record._id,
        quantity: 10,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(409);
    });

    it('should handle ordering all available stock', async () => {
      const record = await createTestRecord(5);

      const createOrderDto = {
        recordId: record._id,
        quantity: 5,
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(201);

      createdOrderIds.push(orderResponse.body._id);

      const recordResponse = await request(app.getHttpServer())
        .get(`/records/${record._id}`)
        .expect(200);

      expect(recordResponse.body.qty).toBe(0);
    });

    it('should return 400 for invalid recordId format', async () => {
      const createOrderDto = {
        recordId: 'invalid-id',
        quantity: 1,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(400);
    });

    it('should return 400 for missing quantity', async () => {
      const record = await createTestRecord(10);

      const createOrderDto = {
        recordId: record._id,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(400);
    });

    it('should return 400 for quantity less than 1', async () => {
      const record = await createTestRecord(10);

      const createOrderDto = {
        recordId: record._id,
        quantity: 0,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(400);
    });

    it('should capture record price at order time', async () => {
      const record = await createTestRecord(10);

      const createOrderDto = {
        recordId: record._id,
        quantity: 1,
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(201);

      createdOrderIds.push(orderResponse.body._id);

      expect(orderResponse.body.price).toBe(25);

      await request(app.getHttpServer())
        .put(`/records/${record._id}`)
        .send({ price: 100 })
        .expect(200);

      expect(orderResponse.body.price).toBe(25);
    });

    it('should handle concurrent orders correctly', async () => {
      const record = await createTestRecord(5);

      const createOrderDto1 = { recordId: record._id, quantity: 3 };
      const createOrderDto2 = { recordId: record._id, quantity: 3 };

      const [result1, result2] = await Promise.all([
        request(app.getHttpServer()).post('/orders').send(createOrderDto1),
        request(app.getHttpServer()).post('/orders').send(createOrderDto2),
      ]);

      const successCount = [result1, result2].filter(
        (r) => r.status === 201,
      ).length;
      const failCount = [result1, result2].filter(
        (r) => r.status === 409,
      ).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      if (result1.status === 201) createdOrderIds.push(result1.body._id);
      if (result2.status === 201) createdOrderIds.push(result2.body._id);

      const recordResponse = await request(app.getHttpServer())
        .get(`/records/${record._id}`)
        .expect(200);

      expect(recordResponse.body.qty).toBe(2);
    });
  });
});
