import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameContextStore } from './GameContextStore.js';
import { DialogueSegmentLog } from './DialogueSegmentLog.js';

describe('DialogueSegmentLog', () => {
  it('appends and backtracks dialogue', () => {
    const log = new DialogueSegmentLog();
    const s1 = log.append({
      phase: 'trial',
      speaker: 'judge',
      speakerDisplay: '法官',
      text: '开庭',
    });
    log.append({
      phase: 'trial',
      speaker: 'prosecutor',
      speakerDisplay: '检察官',
      text: '检方陈述',
    });
    assert.equal(log.getAll().length, 2);
    const kept = log.backtrack(s1.id);
    assert.equal(kept.length, 1);
    assert.equal(kept[0]!.text, '开庭');
    assert.equal(log.getAll().length, 1);
  });
});

describe('GameContextStore', () => {
  it('imports evidence and clues', () => {
    const store = new GameContextStore('sess_1', 'case01', 'naruhodo');
    store.setPhase('investigation');
    store.importEvidence({ id: 'ev1', name: '照片', description: '现场照片' });
    store.importClue({ id: 'cl1', title: '电梯', description: '停在三楼' });
    assert.equal(store.listEvidence().length, 1);
    assert.equal(store.listClues().length, 1);
  });
});
