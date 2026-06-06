import { ApiError } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function downloadFile(
  path: string,
  fileName: string,
  token: string | null,
) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = 'Erro ao baixar arquivo.';
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.json();
      const bodyMessage = body?.message ?? message;
      message = Array.isArray(bodyMessage) ? bodyMessage.join(', ') : bodyMessage;
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revogação adiada: revogar no mesmo tick pode abortar o download em
  // alguns navegadores antes de a navegação ser confirmada.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
