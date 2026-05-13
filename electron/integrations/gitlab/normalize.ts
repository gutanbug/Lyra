import type { RawUser, RawProject } from './types';

export interface NormalizedUser {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface NormalizedRepo {
  id: number;
  fullName: string;
  name: string;
  ownerLogin: string;
  description: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  cloneUrl: string;
  pushedAt: string;
  updatedAt: string;
  stargazersCount: number;
}

export function normalizeUser(raw: RawUser): NormalizedUser {
  return {
    login: raw.username,
    name: raw.name || raw.username,
    avatarUrl: raw.avatar_url,
    htmlUrl: raw.web_url,
  };
}

export function normalizeProject(raw: RawProject): NormalizedRepo {
  return {
    id: raw.id,
    fullName: raw.path_with_namespace,
    name: raw.name,
    ownerLogin: raw.namespace.path,
    description: raw.description || '',
    isPrivate: raw.visibility !== 'public',
    defaultBranch: raw.default_branch,
    htmlUrl: raw.web_url,
    cloneUrl: raw.http_url_to_repo,
    pushedAt: raw.last_activity_at,
    updatedAt: raw.last_activity_at,
    stargazersCount: raw.star_count,
  };
}
