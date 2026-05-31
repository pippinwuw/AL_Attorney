import type { EvidenceItem } from '@ace-attorney/shared';
import styles from './EvidenceCourtRecord.module.css';

interface EvidenceCourtRecordProps {
  collected: EvidenceItem[];
  totalCount: number;
  selectedId?: string;
  onSelect: (item: EvidenceItem) => void;
  onDiscuss?: () => void;
}

export function EvidenceCourtRecord({
  collected,
  totalCount,
  selectedId,
  onSelect,
  onDiscuss,
}: EvidenceCourtRecordProps) {
  const slots = Math.max(4, totalCount);

  return (
    <aside className={styles.record}>
      <div className={styles.header}>证物栏</div>
      <div className={styles.grid}>
        {Array.from({ length: slots }, (_, i) => {
          const item = collected[i];
          if (item) {
            return (
              <button
                key={item.id}
                type="button"
                className={styles.thumb}
                style={selectedId === item.id ? { outline: '3px solid yellow' } : undefined}
                onClick={() => onSelect(item)}
              >
                {item.name}
              </button>
            );
          }
          return (
            <div key={`empty-${i}`} className={`${styles.thumb} ${styles.thumbEmpty}`}>
              ???
            </div>
          );
        })}
      </div>
      <div className={styles.footer}>
        <div className={styles.count}>已收集: {collected.length}/{totalCount}</div>
        <button
          type="button"
          className={styles.actionBtn}
          disabled={!selectedId}
          onClick={onDiscuss}
        >
          与真宵讨论
        </button>
      </div>
    </aside>
  );
}
