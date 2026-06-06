const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type UploadResult = { url: string };

/**
 * Envia um arquivo via XHR (fetch não expõe progresso de upload) e
 * reporta o percentual 0–100 através de onProgress.
 */
export function uploadFileWithProgress(
  path: string,
  file: File,
  token: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Resposta inválida do servidor de upload.'));
        }
      } else {
        let message = 'Falha no upload do arquivo.';
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string | string[] };
          if (body.message) {
            message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
          }
        } catch {
          // mantém a mensagem padrão
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'));
    xhr.onabort = () => reject(new Error('Upload cancelado.'));

    xhr.send(formData);
  });
}
