import type { TestimonyLine } from '@ace-attorney/shared';
import styles from './TestimonyBox.module.css';

interface TestimonyBoxProps {
  lines: TestimonyLine[];
  currentIndex: number;
  onSelectLine?: (index: number) => void;
  readOnly?: boolean;
  completedIds?: string[];
  actions?: React.ReactNode;
}

export function TestimonyBox({
  lines,
  currentIndex,
  onSelectLine,
  readOnly,
  completedIds = [],
  actions,
}: TestimonyBoxProps) {
  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>证言记录</span>
        <span className={styles.headerSub}>Cross-Examination</span>
      </div>
      <div className={styles.lines}>
        {lines.map((line, i) => {
          const isActive = i === currentIndex;
          const isDone = completedIds.includes(line.id) || i < currentIndex;
          const isObjectionable = line.objectionable && !completedIds.includes(line.id);

          return (
            <button
              key={line.id}
              type="button"
              className={`${styles.line} ${isActive ? styles.lineActive : ''} ${isDone ? styles.lineDone : ''}`}
              onClick={() => !readOnly && onSelectLine?.(i)}
              disabled={readOnly}
            >
              <span className={styles.lineMarker}>{isActive ? '▶' : '　'}</span>
              <span className={styles.lineText}>{line.text}</span>
              {isObjectionable && isActive && (
                <span className={styles.contradictionHint}>!</span>
              )}
            </button>
          );
        })}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
