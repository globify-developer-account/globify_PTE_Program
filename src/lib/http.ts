import { NextResponse } from 'next/server'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = 'error',
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const unauthorized = (message = 'You need to sign in to continue.') =>
  new HttpError(401, message, 'unauthorized')

export const forbidden = (message = 'You do not have access to this action.') =>
  new HttpError(403, message, 'forbidden')

export const notFound = (message = 'We could not find what you were looking for.') =>
  new HttpError(404, message, 'not_found')

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, 'bad_request', details)

export const conflict = (message: string) => new HttpError(409, message, 'conflict')

export const tooManyRequests = (message = 'Too many requests. Please slow down and try again.') =>
  new HttpError(429, message, 'rate_limited')

/** Subscription or free-quota gate. The UI turns this into an upgrade prompt. */
export class PaywallError extends HttpError {
  constructor(
    message: string,
    readonly reason: 'no_subscription' | 'expired' | 'quota_exceeded' | 'plan_limit',
    readonly meta: Record<string, unknown> = {},
  ) {
    super(402, message, 'payment_required', meta)
    this.name = 'PaywallError'
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(error: unknown) {
  if (error instanceof PaywallError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code, reason: error.reason, meta: error.meta },
      { status: error.status },
    )
  }
  if (error instanceof HttpError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code, details: error.details },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Some of the information you entered is not valid.',
        code: 'validation_error',
        details: error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }
  console.error('[api] unhandled error:', error)
  return NextResponse.json(
    { ok: false, error: 'Something went wrong on our side. Please try again.', code: 'internal_error' },
    { status: 500 },
  )
}

/** Wraps a route handler so every thrown error becomes a consistent payload. */
export function route<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      return fail(error)
    }
  }
}

/** Parses and validates a JSON body. Input is `unknown` — it is off the wire. */
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw badRequest('Expected a JSON request body.')
  }
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new HttpError(422, 'Some of the information you entered is not valid.', 'validation_error', result.error.flatten().fieldErrors)
  }
  return result.data
}
