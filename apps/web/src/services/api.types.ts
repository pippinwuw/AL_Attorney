import type {
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
  TrialStateResponse,
  TrialAdvanceResponse,
  TrialObjectionRequest,
  TrialObjectionResponse,
  TrialReconstructRequest,
  TrialReconstructResponse,
  TrialBacktrackResponse,
  DossierStateResponse,
  SessionContext,
  GamePhase,
  DialogLine,
  MayaMessage,
} from '@ace-attorney/shared';

export type {
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
  SessionContext,
  GamePhase,
  DialogLine,
  MayaMessage,
  TrialStateResponse,
  TrialAdvanceResponse,
  TrialObjectionRequest,
  TrialObjectionResponse,
  TrialReconstructRequest,
  TrialReconstructResponse,
  TrialBacktrackResponse,
  DossierStateResponse,
};

export interface IGameApi {
  createSession(params: CreateSessionRequest): Promise<CreateSessionResponse>;
  transition(params: TransitionRequest): Promise<TransitionResponse>;
  reportEvent(params: EventRequest): Promise<void>;
  getContext(sessionId: string): Promise<ContextSnapshot>;
  mayaChat(params: MayaChatRequest): Promise<MayaChatResponse>;
  examineHotspot(params: ExamineRequest): Promise<ExamineResponse>;
  pressTestimony(params: PressRequest): Promise<PressResponse>;
  presentEvidence(params: PresentRequest): Promise<PresentResponse>;
  submitChoice(params: ChoiceRequest): Promise<ChoiceResponse>;
  getTrialState(sessionId: string): Promise<TrialStateResponse>;
  advanceTrial(sessionId: string): Promise<TrialAdvanceResponse>;
  submitTrialObjection(params: TrialObjectionRequest): Promise<TrialObjectionResponse>;
  submitTrialReconstruct(params: TrialReconstructRequest): Promise<TrialReconstructResponse>;
  trialBacktrackFromGuilty(sessionId: string): Promise<TrialBacktrackResponse>;
  getDossierState(sessionId: string): Promise<DossierStateResponse>;
}
