export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return res.status(200).json({
    types: [
      'Inspeção Pós-Serviço',
      'Inspeção de Atividades',
      'Inspeção de Luminárias',
      'Inspeção de Redes',
      'Inspeção de Redes Compartilhadas',
      'Inspeção de 5S',
    ],
  });
}
