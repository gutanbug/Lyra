import { useState, useEffect, useCallback } from 'react';
import { integrationController } from 'controllers/account';
import type { FileMeta } from 'components/common/AdfRenderer';

interface PreviewFile {
  dataUrl: string;
  filename: string;
}

interface UseFilePreviewOptions {
  accountId: string | undefined;
  serviceType: 'jira' | 'confluence';
}

export function useFilePreview({ accountId, serviceType }: UseFilePreviewOptions) {
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ESC 키로 미리보기 닫기
  useEffect(() => {
    if (!previewFile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewFile]);

  const handleFileClick = useCallback((fileMeta: FileMeta) => {
    if (!accountId) return;
    const isPdf = fileMeta.mediaType === 'application/pdf' || fileMeta.filename.toLowerCase().endsWith('.pdf');
    const paramKey = serviceType === 'jira' ? 'contentUrl' : 'downloadUrl';

    if (isPdf) {
      setPreviewLoading(true);
      integrationController.invoke({
        accountId,
        serviceType,
        action: 'getAttachmentContent',
        params: { [paramKey]: fileMeta.downloadUrl },
      }).then((dataUrl) => {
        if (typeof dataUrl === 'string') {
          setPreviewFile({ dataUrl, filename: fileMeta.filename });
        }
      }).catch(() => { /* ignore */ })
        .finally(() => setPreviewLoading(false));
    } else {
      integrationController.invoke({
        accountId,
        serviceType,
        action: 'getAttachmentContent',
        params: { [paramKey]: fileMeta.downloadUrl },
      }).then((dataUrl) => {
        if (typeof dataUrl === 'string') {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileMeta.filename;
          link.click();
        }
      }).catch(() => { /* ignore */ });
    }
  }, [accountId, serviceType]);

  const closePreview = useCallback(() => setPreviewFile(null), []);

  return { previewFile, previewLoading, handleFileClick, closePreview };
}
