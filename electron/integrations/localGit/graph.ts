import simpleGit from 'simple-git';
import type { Commit } from './types';

/**
 * 단위 분리자 — git pretty format 필드 사이에 사용.
 * 0x1f(US)와 0x1e(RS)는 커밋 메시지에서 등장할 가능성이 사실상 없음.
 */
const FIELD_SEP = '\x1f';
const RECORD_SEP = '\x1e';

const PRETTY_FORMAT = [
  '%H',  // sha
  '%P',  // parents (space-delimited)
  '%an', // author name
  '%ae', // author email
  '%aI', // author date ISO 8601 strict
  '%cn', // committer name
  '%ce', // committer email
  '%cI', // committer date
  '%D',  // refs (decorate, comma+space delimited)
  '%s',  // subject
  '%b',  // body (may contain newlines)
].join(FIELD_SEP) + RECORD_SEP;

/**
 * 저장소의 커밋을 위에서 아래(최신 → 과거)로 가져온다. topo-order로 부모/자식 관계 보존.
 *
 * @param _repoId 외부 식별자(미사용이지만 IPC 호환성). 실제 git 호출은 `absPath`로 수행.
 * @param absPath 절대 경로
 * @param options.limit 가져올 최대 커밋 수 (기본 500)
 * @param options.skip 건너뛸 커밋 수 (페이지네이션용)
 */
export async function getCommits(
  _repoId: string,
  absPath: string,
  options: { limit?: number; skip?: number } = {},
): Promise<Commit[]> {
  const git = simpleGit(absPath);
  const limit = options.limit ?? 500;
  const skip = options.skip ?? 0;
  const args = ['log', '--all', '--topo-order', `--max-count=${limit}`];
  if (skip > 0) args.push(`--skip=${skip}`);
  args.push(`--pretty=format:${PRETTY_FORMAT}`);

  let raw: string;
  try {
    raw = await git.raw(args);
  } catch {
    return [];
  }

  return parseLog(raw);
}

/** pretty format 출력을 Commit[]로 파싱. 테스트 가능하도록 분리. */
export function parseLog(raw: string): Commit[] {
  const records = raw.split(RECORD_SEP);
  const commits: Commit[] = [];
  for (const rec of records) {
    const trimmed = rec.replace(/^\n+/, '');
    if (!trimmed) continue;
    const fields = trimmed.split(FIELD_SEP);
    if (fields.length < 11) continue;
    const [sha, parents, an, ae, aDate, cn, ce, cDate, refsRaw, subject, body] = fields;
    const refs = refsRaw
      ? refsRaw.split(', ').map((s) => s.trim()).filter(Boolean)
      : [];
    commits.push({
      sha: sha.trim(),
      parents: parents.trim() ? parents.trim().split(/\s+/) : [],
      author: { name: an, email: ae, date: aDate },
      committer: { name: cn, email: ce, date: cDate },
      subject,
      body,
      refs,
    });
  }
  return commits;
}
