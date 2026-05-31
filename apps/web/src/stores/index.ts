import { useGameStore } from './gameStore';
import { useRoleStore } from './roleStore';
import { useEvidenceStore } from './evidenceStore';
import { useDialogStore } from './dialogStore';
import { useTrialStore } from './trialStore';
import { useMayaChatStore } from './mayaChatStore';
import { useCourtRecordStore } from './courtRecordStore';

export function resetAllStores() {
  useGameStore.getState().reset();
  useRoleStore.getState().reset();
  useEvidenceStore.getState().reset();
  useDialogStore.getState().reset();
  useTrialStore.getState().reset();
  useMayaChatStore.getState().reset();
  useCourtRecordStore.getState().reset();
}

export { useGameStore, useRoleStore, useEvidenceStore, useDialogStore, useTrialStore, useMayaChatStore, useCourtRecordStore };
