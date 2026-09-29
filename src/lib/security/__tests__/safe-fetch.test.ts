import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readBodyLimited, safeFetch, safeFetchText } from '../safe-fetch';

let server: Server;
let port: number;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/redirect-internal') {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      return res.end();
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('hello');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('safeFetch', () => {
  it('refuses loopback targets even though the server is reachable', async () => {
    await expect(safeFetch(`http://127.0.0.1:${port}/`)).rejects.toThrow(/private\/internal/);
    await expect(safeFetchText(`http://localhost:${port}/`)).rejects.toThrow();
  });

  it('refuses non-http schemes and credentials', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow();
    await expect(safeFetch('http://user:pw@example.com/')).rejects.toThrow();
  });
});

describe('readBodyLimited', () => {
  it('aborts bodies that exceed the cap', async () => {
    const big = new Response('x'.repeat(5_000));
    await expect(readBodyLimited(big as never, 1_000)).rejects.toThrow(/exceeded|too large/i);
  });

  it('returns bodies within the cap', async () => {
    const ok = new Response('hello');
    expect((await readBodyLimited(ok as never, 1_000)).toString()).toBe('hello');
  });
});
