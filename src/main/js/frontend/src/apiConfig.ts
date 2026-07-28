const RESTXQ_BASE = '/exist/restxq';

export const API_ENDPOINTS = {
  logs: `${RESTXQ_BASE}/stanford/nlp/logs`,
  loadLanguage: (language: string) => `${RESTXQ_BASE}/stanford/nlp/load/${language}`,
  // NER currently uses an uppercase path in the backend RESTXQ module.
  ner: `${RESTXQ_BASE}/Stanford/ner`,
  ragIngest: `${RESTXQ_BASE}/stanford/rag/ingest`,
  ragSearch: `${RESTXQ_BASE}/stanford/rag/search`,
  ragClear: `${RESTXQ_BASE}/stanford/rag/clear`,
  openApi: `${RESTXQ_BASE}/stanford/openapi`
};

