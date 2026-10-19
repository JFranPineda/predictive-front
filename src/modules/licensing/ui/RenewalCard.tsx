import QRCode from 'qrcode';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readError } from '@shared/lib/apiError';
import { Button } from '@shared/ui/Button';
import { Card, Field } from '@shared/ui/Card';

import { useLazyRenewalRequestQuery, useRenewLicenceMutation } from '../infrastructure/endpoints';

/**
 * Renewing an on-premise installation (v4 Phase 3) by its offline road: the
 * request goes out as plain text (or its QR, for a network with no way out),
 * and the `.lic` we send back is uploaded here. The licence in force changes
 * on the next request; nothing restarts.
 */
export function RenewalCard({ validUntil, onRenewed }: { validUntil: string | null; onRenewed: () => void }) {
  const { t } = useTranslation('licensing');
  const [loadRequest, request] = useLazyRenewalRequestQuery();
  const [renew, { isLoading }] = useRenewLicenceMutation();
  const file = useRef<HTMLInputElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  async function generate() {
    setCopied(false);
    const { text } = await loadRequest().unwrap();
    setQr(await QRCode.toDataURL(text, { margin: 1, width: 220 }));
  }

  async function copy() {
    if (!request.data) return;
    await navigator.clipboard.writeText(request.data.text);
    setCopied(true);
  }

  async function upload() {
    const chosen = file.current?.files?.[0];
    if (!chosen) return;
    setMessage(null);
    const body = new FormData();
    body.append('licence', chosen);
    try {
      const outcome = await renew(body).unwrap();
      const key = outcome.status === 'already' ? 'renewal.already' : 'renewal.renewed';
      setMessage({ tone: 'good', text: t(key, { id: outcome.license_id, until: outcome.valid_until }) });
      if (file.current) file.current.value = '';
      onRenewed();
    } catch (cause) {
      setMessage({ tone: 'bad', text: readError(cause) ?? t('renewal.failed') });
    }
  }

  return (
    <Card title={t('renewal.title')} description={t('renewal.hint')}>
      <dl>
        <Field label={t('renewal.validUntil')}>{validUntil ?? '—'}</Field>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void generate()} disabled={request.isFetching}>
          {t('renewal.request')}
        </Button>
      </div>
      {request.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{readError(request.error) ?? t('renewal.failed')}</p>
      )}
      {request.data && (
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">{request.data.text}</pre>
            <p className="mt-2 text-xs text-slate-500">{t('renewal.requestHint')}</p>
            <Button className="mt-2" onClick={() => void copy()}>
              {copied ? t('renewal.copied') : t('renewal.copy')}
            </Button>
          </div>
          {qr && <img src={qr} alt={t('renewal.qr')} className="h-44 w-44 rounded-lg bg-white p-1" />}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input ref={file} type="file" accept=".lic,text/plain" className="text-sm" />
        <Button variant="primary" gate="none" onClick={() => void upload()} disabled={isLoading}>
          {isLoading ? t('renewal.uploading') : t('renewal.upload')}
        </Button>
      </div>
      {message && (
        <p
          className={`mt-3 rounded-lg p-2 text-sm ${
            message.tone === 'good'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
