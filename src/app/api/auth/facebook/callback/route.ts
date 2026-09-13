import { completeOAuth } from '@/lib/auth/oauth'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return completeOAuth('facebook', request)
}
