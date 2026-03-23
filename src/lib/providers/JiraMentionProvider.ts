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
  private _isFiltering = false;
  private _destroyed = false;
  private _abortController: AbortController | null = null;

  constructor(config: JiraMentionProviderConfig) {
    super();
    this.config = config;
  }

  /**
   * 디바운스를 사용하지 않음 — Atlaskit typeahead가 매 keystroke마다
   * subscribe → filter → resolve 사이클을 실행하므로,
   * 디바운스를 걸면 이전 Promise가 resolve되지 않아 typeahead가 멈춤.
   */
  filter(query?: string): void {
    if (this._destroyed) return;
    const q = query || '';
    this._isFiltering = true;

    // 이전 검색 요청 취소
    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();

    this.searchUsers(q, this._abortController.signal);
  }

  private async searchUsers(query: string, signal: AbortSignal): Promise<void> {
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

      // 취소됐거나 destroyed 상태면 무시
      if (signal.aborted || this._destroyed) return;

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
        nickname: u.displayName,
      }));

      const mentionsResult: MentionsResult = {
        mentions,
        query,
      };

      this._isFiltering = false;
      this._notifyListeners(mentionsResult);
      this._notifyAllResultsListeners(mentionsResult);
    } catch (err) {
      if (signal.aborted || this._destroyed) return;
      this._isFiltering = false;
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
    return this._isFiltering;
  }

  destroy(): void {
    this._destroyed = true;
    if (this._abortController) {
      this._abortController.abort();
    }
  }
}
