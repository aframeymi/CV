// HTTP headers that tell browsers what each page may do, as a second line of defence behind output escaping
import helmet from 'helmet';

const SELF = "'self'";
const NONE = "'none'";
const GOOGLE_MAPS = 'https://www.google.com';

// Where each kind of content may come from. Anything not listed is blocked, including every inline
// script, inline style, and event handler attribute, so injected markup cannot run code.
// upgrade-insecure-requests is left out on purpose: it would break http://localhost during development,
// and HSTS already keeps the deployed site on HTTPS.
const CONTENT_SECURITY_POLICY = {
  useDefaults: false,
  directives: {
    defaultSrc: [SELF],
    scriptSrc: [SELF],
    styleSrc: [SELF],
    imgSrc: [SELF],
    connectSrc: [SELF],
    fontSrc: [SELF],
    frameSrc: [GOOGLE_MAPS],
    objectSrc: [NONE],
    baseUri: [SELF],
    formAction: [SELF],
    frameAncestors: [NONE],
  },
};

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export const securityHeaders = helmet({
  contentSecurityPolicy: CONTENT_SECURITY_POLICY,
  // Browsers ignore HSTS over plain HTTP, so local development is not affected
  strictTransportSecurity: { maxAge: ONE_YEAR_SECONDS, includeSubDomains: true },
  // No site may show these pages in a frame, which prevents clickjacking. frame-ancestors above
  // does the same for current browsers, X-Frame-Options for older ones.
  xFrameOptions: { action: 'deny' },
});
