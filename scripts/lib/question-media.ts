import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import {
  needsPromptAudio,
  needsPromptImage,
  questionAudioPath,
  questionImagePath,
} from '../../src/lib/content/media'

/**
 * Filesystem side of the question media convention in src/lib/content/media.
 * Shared by the media builder, the content importer and the seed.
 */

export const PUBLIC_DIR = resolve(__dirname, '../../public')
export const CONTENT_DIR = resolve(__dirname, '../../content/questions')

/** Absolute path on disk for a public URL path such as /media/questions/…. */
export function publicFile(urlPath: string): string {
  return join(PUBLIC_DIR, ...urlPath.split('/').filter(Boolean))
}

/** The prompt media already built for a question, as URL paths ready to store. */
export function builtMediaFor(typeCode: string, title: string): { audioUrl?: string; imageUrl?: string } {
  const media: { audioUrl?: string; imageUrl?: string } = {}
  if (needsPromptAudio(typeCode)) {
    const path = questionAudioPath(typeCode, title)
    if (existsSync(publicFile(path))) media.audioUrl = path
  }
  if (needsPromptImage(typeCode)) {
    const path = questionImagePath(typeCode, title)
    if (existsSync(publicFile(path))) media.imageUrl = path
  }
  return media
}

export interface ContentItem {
  file: string
  index: number
  typeCode: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  content: unknown
}

/** Every item in content/questions/*.json, in file order. */
export function readContentItems(dir = CONTENT_DIR): ContentItem[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .flatMap((name) => {
      const items = JSON.parse(readFileSync(join(dir, name), 'utf8')) as Array<Omit<ContentItem, 'file' | 'index'>>
      return items.map((item, index) => ({ ...item, file: name, index }))
    })
}

/**
 * Points questions that have no prompt media at the files built for them.
 *
 * Only fills gaps: a recording an administrator uploaded in /admin/questions
 * is never replaced by a generated one.
 */
export async function attachBuiltMedia(prisma: PrismaClient): Promise<{ audio: number; images: number }> {
  const questions = await prisma.question.findMany({
    where: { questionType: { exam: 'PTE' }, OR: [{ audioUrl: null }, { imageUrl: null }] },
    select: { id: true, title: true, audioUrl: true, imageUrl: true, questionType: { select: { code: true } } },
  })

  let audio = 0
  let images = 0
  for (const question of questions) {
    const built = builtMediaFor(question.questionType.code, question.title)
    const data: { audioUrl?: string; imageUrl?: string } = {}
    if (!question.audioUrl && built.audioUrl) data.audioUrl = built.audioUrl
    if (!question.imageUrl && built.imageUrl) data.imageUrl = built.imageUrl
    if (!data.audioUrl && !data.imageUrl) continue

    await prisma.question.update({ where: { id: question.id }, data })
    if (data.audioUrl) audio += 1
    if (data.imageUrl) images += 1
  }
  return { audio, images }
}
