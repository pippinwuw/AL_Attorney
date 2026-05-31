import styles from './MayaHintBanner.module.css';

interface MayaHintBannerProps {
  hint: string;
}

export function MayaHintBanner({ hint }: MayaHintBannerProps) {
  return (
    <div className={styles.banner}>
      <span className={styles.label}>真宵:</span>
      {hint}
    </div>
  );
}
