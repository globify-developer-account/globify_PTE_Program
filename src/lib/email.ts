import 'server-only'
import { env } from './env'

/**
 * Email delivery.
 *
 * The default `console` driver writes the message to the server log instead of
 * sending it — that keeps password reset working end-to-end in development
 * without credentials. Set EMAIL_PROVIDER=resend plus EMAIL_API_KEY to deliver
 * for real; adding another provider means adding one branch here and nothing
 * else changes.
 */

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export interface EmailResult {
  delivered: boolean
  provider: string
  /** Populated only by the console driver, so dev flows can surface the link. */
  preview?: string
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  switch (env.email.provider) {
    case 'resend':
      return sendWithResend(message)
    default:
      return sendToConsole(message)
  }
}

function sendToConsole(message: EmailMessage): EmailResult {
  console.info(
    [
      '',
      '──────────── EMAIL (console driver — not delivered) ────────────',
      `To:      ${message.to}`,
      `Subject: ${message.subject}`,
      '',
      message.text,
      '───────────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  )
  return { delivered: false, provider: 'console', preview: message.text }
}

async function sendWithResend(message: EmailMessage): Promise<EmailResult> {
  if (!env.email.apiKey) {
    console.error('[email] EMAIL_PROVIDER=resend but EMAIL_API_KEY is not set.')
    return { delivered: false, provider: 'resend' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.email.apiKey}`,
      },
      body: JSON.stringify({
        from: env.email.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    })

    if (!response.ok) {
      console.error('[email] resend rejected the message:', response.status, await response.text())
      return { delivered: false, provider: 'resend' }
    }
    return { delivered: true, provider: 'resend' }
  } catch (error) {
    console.error('[email] delivery failed:', error instanceof Error ? error.message : error)
    return { delivered: false, provider: 'resend' }
  }
}

export function passwordResetEmail(name: string, resetUrl: string): EmailMessage {
  const text = [
    `Hi ${name},`,
    '',
    'We received a request to reset your Globify PTE Premium password.',
    '',
    `Reset your password: ${resetUrl}`,
    '',
    'This link expires in 60 minutes and can be used once.',
    'If you did not request this, you can safely ignore this email — your password will not change.',
    '',
    '— Globify Consultants',
  ].join('\n')

  return {
    to: '',
    subject: 'Reset your Globify PTE Premium password',
    text,
    html: `<p>Hi ${escapeHtml(name)},</p><p>We received a request to reset your Globify PTE Premium password.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in 60 minutes and can be used once. If you did not request this, you can safely ignore this email.</p><p>— Globify Consultants</p>`,
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}
