// The number of trusted proxies decides which X-Forwarded-For address counts as the visitor's
import { trustedProxyHops } from '../../src/config/proxy.js';

describe('trustedProxyHops', () => {
  it('trusts one proxy when nothing is configured', () => {
    expect(trustedProxyHops({})).toBe(1);
  });

  it('uses the configured number', () => {
    expect(trustedProxyHops({ TRUST_PROXY_HOPS: '3' })).toBe(3);
  });

  it.each(['-1', '1.5', 'two', '', '11'])('refuses %p, so a typo cannot silently trust the wrong address', (value) => {
    expect(() => trustedProxyHops({ TRUST_PROXY_HOPS: value })).toThrow(/TRUST_PROXY_HOPS/);
  });
});
