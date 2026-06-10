import { PresentationRequest, VerificationResult } from '../types';

const requests = new Map<string, PresentationRequest>();
const results = new Map<string, VerificationResult>();

export const requestStore = {
  set: (state: string, req: PresentationRequest) => requests.set(state, req),
  get: (state: string) => requests.get(state),
  delete: (state: string) => requests.delete(state),
};

export const resultStore = {
  set: (state: string, result: VerificationResult) => results.set(state, result),
  get: (state: string) => results.get(state),
};
