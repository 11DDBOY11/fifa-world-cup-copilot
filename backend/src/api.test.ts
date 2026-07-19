import request from 'supertest';
import { app } from './index';

// Mock the orchestrator module to prevent hitting real APIs (Groq)
jest.mock('./orchestrator', () => {
  return {
    orchestrate: jest.fn(),
    client: {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    },
  };
});

import { orchestrate, client } from './orchestrator';

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /venues', () => {
    it('should return a list of all configured venues', async () => {
      const response = await request(app)
        .get('/venues')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('city');
    });
  });

  describe('POST /general-info', () => {
    it('should validate inputs and return 400 if parameters are missing', async () => {
      const response = await request(app)
        .post('/general-info')
        .send({ stadium_name: 'Camp Nou' }) // missing host_city
        .expect(400);

      expect(response.body.error).toBe('host_city is required and must be a string');
    });

    it('should return stadium information from general knowledge using Groq API', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'Camp Nou is a legendary stadium in Barcelona with a capacity of 99,354.',
            },
          },
        ],
      };
      
      const mockedCompletions = client.chat.completions.create as jest.Mock;
      mockedCompletions.mockResolvedValueOnce(mockCompletion);

      const response = await request(app)
        .post('/general-info')
        .send({ stadium_name: 'Camp Nou', host_city: 'Barcelona' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(mockedCompletions).toHaveBeenCalledTimes(1);
      expect(response.body.reply).toBe('Camp Nou is a legendary stadium in Barcelona with a capacity of 99,354.');
    });

    it('should handle Groq API errors gracefully', async () => {
      const mockedCompletions = client.chat.completions.create as jest.Mock;
      mockedCompletions.mockRejectedValueOnce(new Error('Groq rate limit exceeded'));

      const response = await request(app)
        .post('/general-info')
        .send({ stadium_name: 'Camp Nou', host_city: 'Barcelona' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.detail).toBe('Groq rate limit exceeded');
    });
  });

  describe('POST /chat', () => {
    it('should validate chat input parameters', async () => {
      const response = await request(app)
        .post('/chat')
        .send({ session_id: 'test-session', message: 'Hello' }) // missing venue_id
        .expect(400);

      expect(response.body.error).toBe('venue_id is required and must be a string');
    });

    it('should validate that venue_id is an active/supported venue', async () => {
      const response = await request(app)
        .post('/chat')
        .send({ session_id: 'test-session', message: 'Hello', venue_id: 'invalid-venue-id' })
        .expect(400);

      expect(response.body.error).toContain('venue_id must be one of');
    });

    it('should call orchestrate and return response', async () => {
      const mockedOrchestrate = orchestrate as jest.Mock;
      mockedOrchestrate.mockResolvedValueOnce('Hello, how can I assist you at MetLife Stadium today?');

      const response = await request(app)
        .post('/chat')
        .send({ session_id: 'test-session', message: 'Hello', venue_id: 'metlife' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(mockedOrchestrate).toHaveBeenCalledWith('test-session', 'Hello', 'metlife');
      expect(response.body.reply).toBe('Hello, how can I assist you at MetLife Stadium today?');
    });

    it('should handle internal errors gracefully', async () => {
      const mockedOrchestrate = orchestrate as jest.Mock;
      mockedOrchestrate.mockRejectedValueOnce(new Error('Failed to run agent loop'));

      const response = await request(app)
        .post('/chat')
        .send({ session_id: 'test-session', message: 'Hello', venue_id: 'metlife' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.detail).toBe('Failed to run agent loop');
    });
  });
});
