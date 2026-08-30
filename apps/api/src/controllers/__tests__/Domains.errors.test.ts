import type {NextFunction, Request, Response} from 'express';
import express from 'express';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {DomainService} from '../../services/DomainService.js';
import {SecurityService} from '../../services/SecurityService.js';
import {Domains} from '../Domains.js';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';

function createDomainApp() {
  const app = express();
  const domains = new Domains();

  app.use(express.json());
  app.post('/domains', (req, res, next) => {
    res.locals.auth = {type: 'apiKey', projectId: PROJECT_ID};
    void domains.addDomain(req, res, next);
  });
  app.use((_error: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      success: false,
      error: {code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred'},
    });
  });

  return app;
}

describe('POST /domains provider errors', () => {
  beforeEach(() => {
    vi.spyOn(SecurityService, 'isProjectDisabled').mockResolvedValue(false);
    vi.spyOn(DomainService, 'checkSubdomainOfDisabledRoot').mockResolvedValue({blocked: false});
    vi.spyOn(DomainService, 'checkDomainOwnership').mockResolvedValue({exists: false});
  });

  it('keeps the provider message behind the server error boundary', async () => {
    const providerMessage = 'Sensitive provider authorization detail';
    vi.spyOn(DomainService, 'addDomain').mockRejectedValue(new Error(providerMessage));

    const response = await request(createDomainApp()).post('/domains').send({
      projectId: PROJECT_ID,
      domain: 'bookling.example',
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: {code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred'},
    });
    expect(JSON.stringify(response.body)).not.toContain(providerMessage);
  });
});
