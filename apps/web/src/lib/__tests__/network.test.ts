import {afterEach, describe, expect, it, vi} from 'vitest';

import {network} from '../network';

function respondWith(body: string, contentType = 'application/json') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(body, {
        status: 400,
        headers: {'Content-Type': contentType},
      }),
    ),
  );
}

describe('network error responses', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces a legacy string error', async () => {
    respondWith(JSON.stringify({error: 'This domain is already linked to another project.'}));

    await expect(network.fetch('POST', 'https://api.example.com/domains')).rejects.toThrow(
      'This domain is already linked to another project.',
    );
  });

  it('surfaces a standardized error object', async () => {
    respondWith(JSON.stringify({error: {code: 'FORBIDDEN', message: 'You cannot add this domain.'}}));

    await expect(network.fetch('POST', 'https://api.example.com/domains')).rejects.toThrow(
      'You cannot add this domain.',
    );
  });

  it('surfaces a direct message from an upload response', async () => {
    respondWith(JSON.stringify({message: 'The uploaded file is too large.'}));

    await expect(network.upload('POST', 'https://api.example.com/uploads', new FormData())).rejects.toThrow(
      'The uploaded file is too large.',
    );
  });

  it('falls back safely for an HTML error response', async () => {
    respondWith('<html>Bad gateway</html>', 'text/html');

    await expect(network.fetch('GET', 'https://api.example.com/domains')).rejects.toThrow('Something went wrong!');
  });

  it('falls back safely for an empty upload error response', async () => {
    respondWith('');

    await expect(network.upload('POST', 'https://api.example.com/uploads', new FormData())).rejects.toThrow(
      'Something went wrong!',
    );
  });
});
