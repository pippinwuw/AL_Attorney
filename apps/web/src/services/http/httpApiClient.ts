import type {
  IGameApi,
  CreateSessionRequest,
  CreateSessionResponse,
  TransitionRequest,
  TransitionResponse,
  EventRequest,
  ContextSnapshot,
  MayaChatRequest,
  MayaChatResponse,
  ExamineRequest,
  ExamineResponse,
  PressRequest,
  PressResponse,
  PresentRequest,
  PresentResponse,
  ChoiceRequest,
  ChoiceResponse,
  TrialAdvanceResponse,
  TrialObjectionRequest,
  TrialObjectionResponse,
  TrialReconstructRequest,
  TrialReconstructResponse,
  TrialBacktrackResponse,
  TrialStateResponse,
  DossierStateResponse,
} from '../api.types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export class HttpApiClient implements IGameApi {
  createSession(params: CreateSessionRequest): Promise<CreateSessionResponse> {
    return request('/api/session/create', { method: 'POST', body: JSON.stringify(params) });
  }

  transition(params: TransitionRequest): Promise<TransitionResponse> {
    return request('/api/session/transition', { method: 'POST', body: JSON.stringify(params) });
  }

  async reportEvent(params: EventRequest): Promise<void> {
    await request('/api/session/event', { method: 'POST', body: JSON.stringify(params) });
  }

  getContext(sessionId: string): Promise<ContextSnapshot> {
    return request(`/api/session/${sessionId}/context`);
  }

  mayaChat(params: MayaChatRequest): Promise<MayaChatResponse> {
    return request('/api/maya/chat', { method: 'POST', body: JSON.stringify(params) });
  }

  examineHotspot(params: ExamineRequest): Promise<ExamineResponse> {
    return request('/api/investigation/examine', { method: 'POST', body: JSON.stringify(params) });
  }

  pressTestimony(params: PressRequest): Promise<PressResponse> {
    return request('/api/trial/press', { method: 'POST', body: JSON.stringify(params) });
  }

  presentEvidence(params: PresentRequest): Promise<PresentResponse> {
    return request('/api/trial/present', { method: 'POST', body: JSON.stringify(params) });
  }

  submitChoice(params: ChoiceRequest): Promise<ChoiceResponse> {
    return request('/api/trial/choice', { method: 'POST', body: JSON.stringify(params) });
  }

  getTrialState(sessionId: string): Promise<TrialStateResponse> {
    return request(`/api/trial/${sessionId}/state`);
  }

  advanceTrial(sessionId: string): Promise<TrialAdvanceResponse> {
    return request('/api/trial/advance', { method: 'POST', body: JSON.stringify({ sessionId }) });
  }

  submitTrialObjection(params: TrialObjectionRequest): Promise<TrialObjectionResponse> {
    return request('/api/trial/objection', { method: 'POST', body: JSON.stringify(params) });
  }

  submitTrialReconstruct(params: TrialReconstructRequest): Promise<TrialReconstructResponse> {
    return request('/api/trial/reconstruct', { method: 'POST', body: JSON.stringify(params) });
  }

  trialBacktrackFromGuilty(sessionId: string): Promise<TrialBacktrackResponse> {
    return request('/api/trial/backtrack', { method: 'POST', body: JSON.stringify({ sessionId }) });
  }

  getDossierState(sessionId: string): Promise<DossierStateResponse> {
    return request(`/api/dossier/${sessionId}`);
  }
}

export const httpApiClient = new HttpApiClient();
