// The last stop for every request: pages that do not exist, and errors that no route handled.
// Visitors only ever see a short message. The details go to the server log under an error ID,
// which the page shows too, so a problem someone reports can be found in the log.
import { randomBytes } from 'crypto';
import { logError } from '../services/server-log.js';

const PAGE_NOT_FOUND = 'Page not found.';
const SERVER_ERROR = 'Something went wrong. Please try again later.';

// Mistakes in the request itself, such as a malformed body, which the visitor can correct
const CLIENT_ERRORS = {
  400: 'The request could not be read.',
  413: 'The request is too large.',
};
const OTHER_CLIENT_ERROR = 'The request could not be processed.';

export function notFound(req, res) {
  return showError(res, 404, PAGE_NOT_FOUND);
}

// Express recognises an error handler by its four parameters, so `next` must stay even when unused
export function handleError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  if (isClientError(error)) {
    return showError(res, error.status, CLIENT_ERRORS[error.status] ?? OTHER_CLIENT_ERROR);
  }
  const errorId = randomBytes(4).toString('hex');
  logError(errorId, req, error);
  return showError(res, 500, SERVER_ERROR, errorId);
}

// Errors raised by Express and body-parser carry the HTTP status they stand for
function isClientError(error) {
  return Number.isInteger(error?.status) && error.status >= 400 && error.status < 500;
}

function showError(res, status, message, errorId) {
  res.status(status).render('error', { title: 'Error', message, errorId }, (renderError, html) => {
    // If even the error page fails, fall back to plain text, still without any details
    res.send(renderError ? message : html);
  });
}
