import { useState } from 'react';
import type { EvidenceItem } from '@ace-attorney/shared';
import styles from './ObjectionPanel.module.css';

interface ObjectionPanelProps {
  lineText: string;
  evidence: EvidenceItem[];
  loading?: boolean;
  onSubmit: (evidenceId: string, explanation: string) => void;
  onCancel: () => void;
}

export function ObjectionPanel({
  lineText,
  evidence,
  loading,
  onSubmit,
  onCancel,
}: ObjectionPanelProps) {
  const [evidenceId, setEvidenceId] = useState('');
  const [explanation, setExplanation] = useState('');

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>异议！</div>
        <p className={styles.line}>「{lineText}」</p>
        <label className={styles.label}>出示证物</label>
        <select
          className={styles.select}
          value={evidenceId}
          onChange={(e) => setEvidenceId(e.target.value)}
          disabled={loading}
        >
          <option value="">选择证物…</option>
          {evidence.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <label className={styles.label}>说明矛盾</label>
        <textarea
          className={styles.textarea}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="说明证物与证词的矛盾…"
          disabled={loading}
          rows={4}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
            取消
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={loading || !evidenceId || !explanation.trim()}
            onClick={() => onSubmit(evidenceId, explanation.trim())}
          >
            {loading ? '提交中…' : '提交辩护'}
          </button>
        </div>
      </div>
    </div>
  );
}
