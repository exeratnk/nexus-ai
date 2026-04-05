export const TAG_ORDER = ['important', 'save', 'check']

export const TAG_META = {
  important: { label: 'Важно', color: '#EF9F27' },
  save: { label: 'Сохранить', color: '#5DCAA5' },
  check: { label: 'Перепроверить', color: '#F09595' },
}

export function isAnnotationTag(tag) {
  return tag === 'important' || tag === 'save' || tag === 'check'
}

export function getPrimaryTagColor(annotation) {
  if (!annotation || !Array.isArray(annotation.tags) || annotation.tags.length === 0) return null
  const firstTag = annotation.tags[0]
  return TAG_META[firstTag]?.color || null
}
