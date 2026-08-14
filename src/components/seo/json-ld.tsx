/**
 * Structured data is always built from our own constants and database content,
 * never from unescaped user input.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
