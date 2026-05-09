const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

export const processNetworkGraph = async (logs) => {
  if (!Array.isArray(logs)) {
    throw new Error('logs must be an array.');
  }

  const response = await fetch(`${API_BASE_URL}/graph/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs })
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
};
