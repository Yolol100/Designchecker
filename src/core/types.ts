export type Owner =
  | 'design'
  | 'seo'
  | 'elementor'
  | 'wordpressqualityarchitect'
  | 'leads'
  | 'website-qa-checklist'
  | 'webactueel-workflow';

export type EvidenceLevel =
  | 'source'
  | 'controlled_runtime'
  | 'staging'
  | 'browser_at'
  | 'production_observation';

export interface EvidenceEnvelope<T> {
  schemaVersion: '1.0';
  owner: Owner;
  tool: string;
  target?: string;
  evidenceLevel: EvidenceLevel;
  capturedAt: string;
  status: 'ok' | 'partial' | 'error';
  data: T;
  limits: string[];
}

export interface ViewportSpec {
  name: string;
  width: number;
  height: number;
}
