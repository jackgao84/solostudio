/**
 * Clips stay on the iPad: the newest 3 per section and the newest 3 run-throughs are kept, and she
 * is told when an older one is deleted.
 */
import { describe, expect, it } from 'vitest'
import { KEEP_NEWEST, clipsToDelete, groupOf } from '../../src/model/clips'

const clip = (id: string, group: string, createdAt: number) => ({ id, group, createdAt })

describe('keeping the newest clips', () => {
  it('keeps 3 per section and 3 run-throughs', () => {
    expect(KEEP_NEWEST).toBe(3)
    expect(groupOf('run')).toBe('run')
    expect(groupOf('v1')).toBe('section:v1')
  })

  it('deletes only the oldest beyond the newest 3, in that group', () => {
    const clips = [
      clip('a', 'section:v1', 1),
      clip('b', 'section:v1', 5),
      clip('c', 'section:v1', 3),
      clip('d', 'section:v1', 4),
      clip('e', 'section:v1', 2),
      clip('r1', 'run', 1),
      clip('x', 'section:v2', 0),
    ]
    expect(clipsToDelete(clips, 'section:v1').map((c) => c.id)).toEqual(['a', 'e'])
    expect(clipsToDelete(clips, 'run')).toEqual([])
    expect(clipsToDelete(clips, 'section:v2')).toEqual([])
  })

  it('deletes nothing while there are 3 or fewer', () => {
    expect(clipsToDelete([clip('a', 'run', 1), clip('b', 'run', 2), clip('c', 'run', 3)], 'run')).toEqual([])
  })
})
