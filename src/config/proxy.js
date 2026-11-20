// How many proxies in front of the application add an address to X-Forwarded-For.
// Express skips that many addresses from the end of the list to find the visitor's own address,
// which the rate limits and the security log rely on. Too few gives the address of a proxy;
// too many gives an address the visitor can fake by sending the header themselves.
const DEFAULT_HOPS = 1;
const MAX_HOPS = 10;

export function trustedProxyHops(env = process.env) {
  const configured = env.TRUST_PROXY_HOPS ?? String(DEFAULT_HOPS);
  const hops = Number(configured);
  if (!/^\d+$/.test(configured) || hops > MAX_HOPS) {
    throw new Error(`TRUST_PROXY_HOPS must be a whole number from 0 to ${MAX_HOPS}.`);
  }
  return hops;
}
