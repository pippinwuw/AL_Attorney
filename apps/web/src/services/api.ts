import type { IGameApi } from './api.types';
import { mockApiClient } from './mock/mockApiClient';
import { httpApiClient } from './http/httpApiClient';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export const api: IGameApi = useMock ? mockApiClient : httpApiClient;

export { useMock };
