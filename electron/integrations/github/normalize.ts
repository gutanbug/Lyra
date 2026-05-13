import type { RawUser, RawRepo } from './types';

/**
 * 정규화된 타입(Renderer가 보는 형태).
 * src/types/github.ts와 shape 일치해야 함.
 */
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
    login: raw.login,
    name: raw.name || raw.login,
    avatarUrl: raw.avatar_url,
    htmlUrl: raw.html_url,
  };
}

export function normalizeRepo(raw: RawRepo): NormalizedRepo {
  return {
    id: raw.id,
    fullName: raw.full_name,
    name: raw.name,
    ownerLogin: raw.owner.login,
    description: raw.description || '',
    isPrivate: raw.private,
    defaultBranch: raw.default_branch,
    htmlUrl: raw.html_url,
    cloneUrl: raw.clone_url,
    pushedAt: raw.pushed_at,
    updatedAt: raw.updated_at,
    stargazersCount: raw.stargazers_count,
  };
}
