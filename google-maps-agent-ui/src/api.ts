// API service layer for the Google Maps Agent

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9099';
const API_KEY = import.meta.env.VITE_API_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

export interface ChatRequest {
  session_id: string;
  message: string;
}

export interface ChatResponse {
  response: string;
}

export interface HealthResponse {
  status: string;
  agent?: string;
  mcp_url?: string;
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }

  return res.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
