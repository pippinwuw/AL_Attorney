import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { resetAllStores } from '@/stores';
import { case01 } from '@/data/mock/caseData';
import styles from './VerdictPage.module.css';

export function VerdictPage() {
  const navigate = useNavigate();

  const backToTitle = () => {
    resetAllStores();
    navigate('/');
  };

  return (
    <div className={styles.verdictPage}>
      <h1 className={styles.title}>{case01.verdict.title}</h1>
      <p className={styles.text}>{case01.verdict.text}</p>
      <Button onClick={backToTitle}>返回标题</Button>
    </div>
  );
}
