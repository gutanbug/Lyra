/**
 * Atlaskit Editor용 Jira 멘션 프로바이더
 * @atlaskit/mention의 AbstractMentionResource를 구현하여
 * Jira searchAssignableUsers API로 사용자를 조회합니다.
 */
import { AbstractMentionResource } from '@atlaskit/mention/resource';
import type { MentionDescription, MentionsResult } from '@atlaskit/mention';
import { integrationController } from 'controllers/account';

interface JiraMentionProviderConfig {
  accountId: string;
  issueKey: string;
}

export class JiraMentionProvider extends AbstractMentionResource {
  private config: JiraMentionProviderConfig;
  private lastQuery = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: JiraMentionProviderConfig) {
    super();
    this.config = config;
  }

  filter(query?: string): void {
    const q = query || '';
    this.lastQuery = q;

    // 디바운스 (200ms)
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.searchUsers(q);
    }, 200);
  }

  private async searchUsers(query: string): Promise<void> {
    try {
      const result = await integrationController.invoke({
        accountId: this.config.accountId,
        serviceType: 'jira',
        action: 'searchAssignableUsers',
        params: {
          issueKey: this.config.issueKey,
          query,
        },
      });

      const users = (result || []) as Array<{
        accountId: string;
        displayName: string;
        avatarUrl: string;
        emailAddress?: string;
      }>;

      const mentions: MentionDescription[] = users.map((u) => ({
        id: u.accountId,
        name: u.displayName,
        mentionName: u.displayName,
        avatarUrl: u.avatarUrl || '',
        nickname: u.emailAddress || '',
      }));

      // 쿼리가 변경되었으면 이전 결과 무시
      if (query !== this.lastQuery) return;

      const mentionsResult: MentionsResult = {
        mentions,
        query,
      };

      this._notifyListeners(mentionsResult);
    } catch (err) {
      console.error('[JiraMentionProvider] search error:', err);
      this._notifyErrorListeners(err instanceof Error ? err : new Error(String(err)), query);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordMentionSelection(_mention: MentionDescription): void {
    // no-op
  }

  shouldHighlightMention(_mention: MentionDescription): boolean {
    return false;
  }

  isFiltering(_query: string): boolean {
    return false;
  }
}
