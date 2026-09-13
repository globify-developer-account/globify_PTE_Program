import { beginOAuth } from '@/lib/auth/oauth'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return beginOAuth('facebook', request)
}
