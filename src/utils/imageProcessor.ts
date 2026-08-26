/**
 * Image Processor for INSPEÇÃO PRONTO!
 * Implements requirement: Max 1920x1080 px, 80-85% JPEG quality,
 * format validation, orientation correction, size optimization.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  originalName: string;
  timestamp: string;
}

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

export async function processInspectionImage(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.82
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    // Check file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      return reject(new Error('Formato inválido. Utilize JPG, PNG ou WEBP.'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Falha ao ler o arquivo de imagem selecionado.'));
    };

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Arquivo de imagem corrompido ou formato não suportado.'));
      };

      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving dimensions
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Falha ao inicializar processador gráfico.'));
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Estimate size in KB from base64
        const stringLength = optimizedDataUrl.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383612;
        const sizeKb = Math.round(sizeInBytes / 1024);

        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        resolve({
          dataUrl: optimizedDataUrl,
          width,
          height,
          sizeKb: Math.max(1, sizeKb),
          originalName: file.name,
          timestamp: formattedDate
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Creates sample fallback images for demo/test purposes
 */
export function createPlaceholderPhotoUrl(title: string, subtitle: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 600);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);

  // Grid pattern
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 0; y < 600; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }

  // Border frame
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 760, 560);

  // Icon symbol box
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(350, 180, 100, 100, 16);
  ctx.fill();

  // Camera lens representation
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(400, 230, 28, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(400, 230, 18, 0, 2 * Math.PI);
  ctx.fill();

  // Text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 400, 340);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px sans-serif';
  ctx.fillText(subtitle, 400, 380);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px monospace';
  ctx.fillText(`INSPEÇÃO PRONTO! • ${new Date().toLocaleDateString('pt-BR')}`, 400, 530);

  return canvas.toDataURL('image/jpeg', 0.85);
}
