import { useNavigate } from 'react-router-dom';
import type { PlayerRole } from '@ace-attorney/shared';
import { Button } from '@/components/common/Button';
import { useRoleStore } from '@/stores/roleStore';
import { useGameStore } from '@/stores/gameStore';
import { resetAllStores } from '@/stores';
import { api } from '@/services/api';
import styles from './TitlePage.module.css';

export function TitlePage() {
  const navigate = useNavigate();
  const { playerRole, setPlayerRole } = useRoleStore();
  const setSessionId = useGameStore((s) => s.setSessionId);

  const startGame = async () => {
    resetAllStores();
    useRoleStore.getState().setPlayerRole(playerRole);
    const res = await api.createSession({ caseId: 'case01', playerRole });
    setSessionId(res.sessionId);
    useGameStore.getState().setPhase('prologue');
    navigate('/prologue');
  };

  const selectRole = (role: PlayerRole) => setPlayerRole(role);

  return (
    <div className={styles.titlePage}>
      <h1 className={styles.logo}>
        成步堂的选择
        <br />
        <span style={{ fontSize: '10px', opacity: 0.7 }}>ACE ATTORNEY MVP</span>
      </h1>

      <div className={styles.roleSelect}>
        <button
          type="button"
          className={`${styles.roleCard} ${playerRole === 'naruhodo' ? styles.roleCardActive : ''}`}
          onClick={() => selectRole('naruhodo')}
        >
          <div className={styles.roleName}>成步堂龙一</div>
          <div className={styles.roleDesc}>辩护律师 · 完整玩法</div>
        </button>
        <button
          type="button"
          className={`${styles.roleCard} ${playerRole === 'maya' ? styles.roleCardActive : ''}`}
          onClick={() => selectRole('maya')}
        >
          <div className={styles.roleName}>仓院真宵</div>
          <div className={styles.roleDesc}>助手 · 控件占位</div>
        </button>
      </div>

      <div className={styles.menu}>
        <Button className={styles.menuBtn} onClick={startGame}>
          新游戏
        </Button>
        <Button className={`${styles.menuBtn} ${styles.disabled}`} disabled title="暂无存档">
          继续游戏
        </Button>
        <Button className={styles.menuBtn}>设置</Button>
      </div>
    </div>
  );
}
