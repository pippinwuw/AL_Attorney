import { useState } from 'react';
import type { ReconstructionStep } from '@ace-attorney/shared';
import styles from './ReconstructionPanel.module.css';

interface ReconstructionPanelProps {
  step?: ReconstructionStep;
  completedCount: number;
  totalCount: number;
  loading?: boolean;
  onSubmit: (input: string) => void;
}

export function ReconstructionPanel({
  step,
  completedCount,
  totalCount,
  loading,
  onSubmit,
}: ReconstructionPanelProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput('');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        犯罪现场还原 ({completedCount}/{totalCount})
      </div>
      {step && <p className={styles.prompt}>{step.prompt}</p>}
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="输入还原说明…"
          disabled={loading || !step}
        />
        <button
          type="button"
          className={styles.btn}
          onClick={handleSubmit}
          disabled={loading || !input.trim() || !step}
        >
          提交
        </button>
      </div>
    </div>
  );
}
