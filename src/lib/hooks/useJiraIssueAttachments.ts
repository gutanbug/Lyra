/**
 * Jira 이슈 첨부파일 상태 관리 훅
 * rawIssueData/rawCommentsData → 첨부 파싱 + media ID 매칭 + 이미지 프록시 로드
 */
import { useState, useEffect } from 'react';
import { integrationController } from 'controllers/account';
import { str, obj } from 'lib/utils/typeHelpers';
import { extractMediaIds } from 'lib/utils/adfUtils';
import type { JiraAttachment } from 'types/jira';
import type { FileMeta } from 'components/common/AdfRenderer';
import type { Account } from 'types/account';

export interface UseJiraIssueAttachmentsOptions {
  activeAccount: Account | null;
  rawIssueData?: unknown;
  rawCommentsData?: unknown;
}

export interface UseJiraIssueAttachmentsResult {
  attachments: JiraAttachment[];
  attachmentImages: Record<string, string>;
  mediaUrlMap: Record<string, string>;
  fileMetaMap: Record<string, FileMeta>;
  lightboxSrc: string | null;
  setLightboxSrc: (src: string | null) => void;
}

function useJiraIssueAttachments({
  activeAccount,
  rawIssueData,
  rawCommentsData,
}: UseJiraIssueAttachmentsOptions): UseJiraIssueAttachmentsResult {
  const [attachments, setAttachments] = useState<JiraAttachment[]>([]);
  const [attachmentImages, setAttachmentImages] = useState<Record<string, string>>({});
  const [mediaUrlMap, setMediaUrlMap] = useState<Record<string, string>>({});
  const [fileMetaMap, setFileMetaMap] = useState<Record<string, FileMeta>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!activeAccount || !rawIssueData || typeof rawIssueData !== 'object') {
      return;
    }

    let cancelled = false;

    // 이슈 전환 시 이전 상태 초기화
    setAttachments([]);
    setAttachmentImages({});
    setMediaUrlMap({});
    setFileMetaMap({});

    const raw = rawIssueData as Record<string, unknown>;
    const rawAttachments = raw.attachment as unknown[] | undefined;
    if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) return;

    const allParsed: JiraAttachment[] = rawAttachments
      .filter((a) => a && typeof a === 'object')
      .map((a) => {
        const att = a as Record<string, unknown>;
        const authorObj = obj(att.author);
        return {
          id: str(att.id),
          filename: str(att.filename),
          mimeType: str(att.mimeType),
          size: typeof att.size === 'number' ? att.size : 0,
          contentUrl: str(att.content),
          thumbnailUrl: str(att.thumbnail) || undefined,
          created: str(att.created),
          author: str(authorObj?.displayName) || str(authorObj?.display_name) || str(authorObj?.name) || '',
        };
      })
      .filter((a) => a.id);

    const imageAtts = allParsed.filter((a) => a.mimeType.startsWith('image/'));
    const fileAtts = allParsed.filter((a) => !a.mimeType.startsWith('image/'));
    setAttachments(imageAtts);

    // ADF 설명 + 댓글에서 media ID 추출
    const rawDesc = (raw.fields && typeof raw.fields === 'object')
      ? (raw.fields as Record<string, unknown>).description
      : raw.description;
    const mediaIds = extractMediaIds(rawDesc);
    if (Array.isArray(rawCommentsData)) {
      for (const c of rawCommentsData) {
        if (c && typeof c === 'object') {
          const commentMediaIds = extractMediaIds((c as Record<string, unknown>).body);
          mediaIds.push(...commentMediaIds);
        }
      }
    }

    // mediaApiFileId로 직접 매핑, 없으면 순서 기반 매핑
    const mediaToAttachment: Record<string, JiraAttachment> = {};
    const matchedAttIds = new Set<string>();
    for (const mid of mediaIds) {
      const byMediaApi = rawAttachments.find((a) => {
        const att = a as Record<string, unknown>;
        return str(att.mediaApiFileId) === mid;
      });
      if (byMediaApi) {
        const attId = str((byMediaApi as Record<string, unknown>).id);
        const found = allParsed.find((p) => p.id === attId);
        if (found) {
          mediaToAttachment[mid] = found;
          matchedAttIds.add(found.id);
        }
      }
    }
    const unmatchedMedia = mediaIds.filter((mid) => !mediaToAttachment[mid]);
    const unmatchedAtts = allParsed.filter((a) => !matchedAttIds.has(a.id));
    for (let i = 0; i < unmatchedMedia.length && i < unmatchedAtts.length; i++) {
      mediaToAttachment[unmatchedMedia[i]] = unmatchedAtts[i];
    }

    // 이미지 프록시 로드
    for (const att of imageAtts) {
      integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'getAttachmentContent',
        params: { contentUrl: att.contentUrl },
      }).then((dataUrl) => {
        if (cancelled) return;
        if (typeof dataUrl === 'string') {
          setAttachmentImages((prev) => ({ ...prev, [att.id]: dataUrl }));
          for (const [mid, mappedAtt] of Object.entries(mediaToAttachment)) {
            if (mappedAtt.id === att.id) {
              setMediaUrlMap((prev) => ({ ...prev, [mid]: dataUrl }));
            }
          }
        }
      }).catch(() => { /* ignore */ });
    }

    // 비이미지 파일 → fileMetaMap
    const fileMetas: Record<string, FileMeta> = {};
    for (const [mid, att] of Object.entries(mediaToAttachment)) {
      if (!att.mimeType.startsWith('image/')) {
        fileMetas[mid] = {
          filename: att.filename,
          mediaType: att.mimeType || 'application/octet-stream',
          size: att.size,
          downloadUrl: att.contentUrl,
        };
      }
    }
    for (const att of fileAtts) {
      if (!matchedAttIds.has(att.id)) {
        fileMetas[att.id] = {
          filename: att.filename,
          mediaType: att.mimeType || 'application/octet-stream',
          size: att.size,
          downloadUrl: att.contentUrl,
        };
      }
    }
    if (Object.keys(fileMetas).length > 0) {
      setFileMetaMap(fileMetas);
    }

    return () => {
      cancelled = true;
    };
  }, [activeAccount, rawIssueData, rawCommentsData]);

  return {
    attachments,
    attachmentImages,
    mediaUrlMap,
    fileMetaMap,
    lightboxSrc,
    setLightboxSrc,
  };
}

export default useJiraIssueAttachments;
