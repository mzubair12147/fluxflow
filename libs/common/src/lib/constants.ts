export const httpStatusCodes = [
  // 1xx: Informational (Request received, continuing process)
  {
    code: 100,
    name: 'Continue',
    description: 'Proceed with the rest of the request',
  },
  {
    code: 101,
    name: 'Switching Protocols',
    description: 'Switching to a different protocol (e.g., WebSocket)',
  },

  // 2xx: Success (The action was successfully received and accepted)
  { code: 200, name: 'OK', description: 'Standard success response' },
  {
    code: 201,
    name: 'Created',
    description: 'New resource successfully created (common for POST/PUT)',
  },
  {
    code: 202,
    name: 'Accepted',
    description: 'Request accepted but processing is not yet complete',
  },
  {
    code: 204,
    name: 'No Content',
    description: 'Request succeeded but there is no body to return',
  },

  // 3xx: Redirection (Further action needed to complete the request)
  {
    code: 301,
    name: 'Moved Permanently',
    description: 'Resource has a new permanent URL',
  },
  {
    code: 302,
    name: 'Found',
    description: 'Resource is temporarily at a different URL',
  },
  {
    code: 304,
    name: 'Not Modified',
    description: 'Cached version is still valid; no download needed',
  },
  {
    code: 307,
    name: 'Temporary Redirect',
    description: 'Redirect that maintains the original HTTP method',
  },

  // 4xx: Client Error (Request contains incorrect syntax or cannot be fulfilled)
  {
    code: 400,
    name: 'Bad Request',
    description: 'Invalid request (e.g., malformed syntax)',
  },
  {
    code: 401,
    name: 'Unauthorized',
    description: 'Authentication is required or has failed',
  },
  {
    code: 403,
    name: 'Forbidden',
    description: 'Authenticated but lacks permission to access resource',
  },
  {
    code: 404,
    name: 'Not Found',
    description: 'Resource could not be found at the specified URL',
  },
  {
    code: 405,
    name: 'Method Not Allowed',
    description: 'HTTP method used is not supported for this endpoint',
  },
  {
    code: 409,
    name: 'Conflict',
    description: 'Request conflicts with current server state',
  },
  {
    code: 422,
    name: 'Unprocessable Entity',
    description: 'Semantic errors in valid syntax (validation failed)',
  },
  {
    code: 429,
    name: 'Too Many Requests',
    description: 'User has exceeded rate limits',
  },

  // 5xx: Server Error (Server failed to fulfill a valid request)
  {
    code: 500,
    name: 'Internal Server Error',
    description: 'Generic server-side error',
  },
  {
    code: 502,
    name: 'Bad Gateway',
    description: 'Invalid response from an upstream server',
  },
  {
    code: 503,
    name: 'Service Unavailable',
    description: 'Server is overloaded or down for maintenance',
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    description: 'Upstream server took too long to respond',
  },
];

export const statusCodes = [
  100, 101, 102, 103, 200, 201, 202, 203, 204, 205, 206, 300, 301, 302, 303,
  304, 307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411,
  412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429,
  431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
];

export const DRIZZLE = 'DRIZZLE_CLIENT';
export const REDIS_TOKEN = 'REDIS_CLIENT';
