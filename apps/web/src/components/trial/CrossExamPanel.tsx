import { HealthBar } from '@/components/common/HealthBar';
import styles from './CrossExamPanel.module.css';

interface CrossExamPanelProps {
  hp: number;
  disabled?: boolean;
  placeholder?: boolean;
  onPress: () => void;
  onPresent: () => void;
}

export function CrossExamPanel({
  hp,
  disabled,
  placeholder,
  onPress,
  onPresent,
}: CrossExamPanelProps) {
  if (placeholder) {
    return (
      <div className={styles.actions}>
        <div className={styles.placeholder}>助手模式：法庭操作控件占位（请使用真宵对话面板）</div>
        <HealthBar hp={hp} />
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      <div className={styles.buttons}>
        <button type="button" className={styles.btn} disabled={disabled} onClick={onPress}>
          追问
        </button>
        <button type="button" className={styles.btn} disabled={disabled} onClick={onPresent}>
          出示证物
        </button>
      </div>
      <HealthBar hp={hp} />
    </div>
  );
}
