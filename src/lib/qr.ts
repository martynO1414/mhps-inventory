import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string, size = 256): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export function validateItemId(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (/^MHSA-\d{6}$/.test(trimmed)) return trimmed;
  return null;
}
