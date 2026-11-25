/** An expected failure that becomes a JSON error response with this status and code. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Seconds the caller should wait, sent as Retry-After. */
    public retryAfter?: number,
  ) {
    super(message);
  }
}
