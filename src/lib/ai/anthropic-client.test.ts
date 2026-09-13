import { describe, expect, it } from 'vitest'
import { isClaudePlatformOnAwsKey } from './anthropic-client'

/**
 * Scoring and content generation can use keys from different platforms at the
 * same time, so the platform must come from each key itself — never from a
 * shared setting such as the AWS workspace ID.
 */

describe('isClaudePlatformOnAwsKey', () => {
  it('treats sk-ant- keys as first-party Anthropic keys', () => {
    expect(isClaudePlatformOnAwsKey('sk-ant-api03-example')).toBe(false)
  })

  it('treats AWS Console and short-term AWS keys as Claude Platform on AWS keys', () => {
    expect(isClaudePlatformOnAwsKey('AEAAQWVhQXBpS2V5LWV4YW1wbGU=')).toBe(true)
    expect(isClaudePlatformOnAwsKey('aws-external-anthropic-api-key-ZXhhbXBsZQ==')).toBe(true)
  })
})
