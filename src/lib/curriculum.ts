import type { Curriculum } from '../types'
import curriculumJson from '../data/curriculum.json'

/**
 * The curriculum is the largest data file in the project and is only ever
 * needed by study mode. It lives in its own module so that the lazily loaded
 * study route carries it, and the health overview does not.
 */
export const curriculum = curriculumJson as unknown as Curriculum
