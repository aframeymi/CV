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

// Browser features the site never uses, switched off for its pages and for the frames in them,
// so injected code or an embedded page cannot ask for the camera, the location, or payments
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'payment=()',
  'usb=()',
].join(', ');

// Cross-Origin-Embedder-Policy stays off: it would block the Google Maps frame, which sends no
// header allowing it to be embedded that way
const helmetHeaders = helmet({
  contentSecurityPolicy: CONTENT_SECURITY_POLICY,
  // Browsers ignore HSTS over plain HTTP, so local development is not affected
  strictTransportSecurity: { maxAge: ONE_YEAR_SECONDS, includeSubDomains: true },
  // No site may show these pages in a frame, which prevents clickjacking. frame-ancestors above
  // does the same for current browsers, X-Frame-Options for older ones.
  xFrameOptions: { action: 'deny' },
});

function setPermissionsPolicy(req, res, next) {
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  next();
}

export const securityHeaders = [helmetHeaders, setPermissionsPolicy];

// Pages can show the logged-in user's name and always carry a CSRF token, so neither the browser
// nor a proxy may keep a copy. Static files are registered before this and stay cacheable.
export function preventCaching(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
