import type { EvidenceEnvelope, EvidenceLevel, Owner } from './types.js';

export function evidence<T>(args: {
  owner: Owner;
  tool: string;
  target?: string;
  evidenceLevel?: EvidenceLevel;
  data: T;
  limits?: string[];
  status?: EvidenceEnvelope<T>['status'];
}): EvidenceEnvelope<T> {
  return {
    schemaVersion: '1.0',
    owner: args.owner,
    tool: args.tool,
    target: args.target,
    evidenceLevel: args.evidenceLevel ?? 'controlled_runtime',
    capturedAt: new Date().toISOString(),
    status: args.status ?? 'ok',
    data: args.data,
    limits: args.limits ?? []
  };
}
