export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return res.status(200).json({
    rooms: [
      {
        id: 'tecnico@inspecaopronto.com',
        name: 'Sala do Técnico',
        email: 'tecnico@inspecaopronto.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        isDefault: true,
        description: 'Sala unificada central do sistema para compartilhamento de todas as inspeções',
      },
    ],
  });
}
