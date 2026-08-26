import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface InspectionPhoto {
  id: string;
  numero: number;
  dataUrl: string;
  legenda: string;
  dataUpload: string;
  largura?: number;
  altura?: number;
  tamanhoKb?: number;
  nomeArquivo?: string;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  precisao?: number;
  altitude?: number;
  dataCaptura: string;
  endereco?: string;
  semGps?: boolean;
}

interface Inspection {
  id: string;
  uuid: string;
  status: 'rascunho' | 'processando' | 'concluida' | 'sincronizada';
  dataCriacao: string;
  dataEnvio?: string;
  obra: string;
  equipe: string;
  tecnicoResponsavel: string;
  local: string;
  tipoInspecao: string;
  fotos: InspectionPhoto[];
  responsavel: string;
  matricula?: string;
  observacaoGeral?: string;
  localizacao?: GPSLocation;
  sincronizado: boolean;
  versaoApp: string;
}

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const DEFAULT_INSPECTION_TYPES = [
  'Inspeção Pós-Serviço',
  'Inspeção de Atividades',
  'Inspeção de Luminárias',
  'Inspeção de Redes',
  'Inspeção de Redes Compartilhadas',
  'Inspeção de 5S',
];

interface DatabaseSchema {
  inspections: Inspection[];
  inspectionTypes: string[];
  lastUpdated: string;
}

// Ensure data folder and file exist
function initializeDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.inspections)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  // Initial seed data
  const initialDb: DatabaseSchema = {
    inspections: [
      {
        id: 'INS-2026-000152',
        uuid: 'seed-uuid-1',
        status: 'concluida',
        dataCriacao: '25/08/2026 14:15',
        dataEnvio: '25/08/2026 15:47',
        obra: 'Subestação Norte',
        equipe: 'EBP01',
        tecnicoResponsavel: 'João Silva',
        local: 'Sala Elétrica 03 - Painéis MT/BT',
        tipoInspecao: 'Inspeção Pós-Serviço',
        responsavel: 'João Silva',
        matricula: 'TEC-9842',
        observacaoGeral: 'Inspeção pós-manutenção concluída. Todos os circuitos restabelecidos e torqueamento de barramentos verificado conforme norma técnica.',
        localizacao: {
          latitude: -23.55052,
          longitude: -46.633308,
          precisao: 8,
          dataCaptura: '25/08/2026 às 14:20',
          endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        },
        fotos: [],
        sincronizado: true,
        versaoApp: '2.0.0',
      },
      {
        id: 'INS-2026-000151',
        uuid: 'seed-uuid-2',
        status: 'concluida',
        dataCriacao: '25/08/2026 09:30',
        dataEnvio: '25/08/2026 10:12',
        obra: 'Rede Urbana Setor Leste',
        equipe: 'EQUIPE-ALFA',
        tecnicoResponsavel: 'Mariana Costa',
        local: 'Poste P-44 / Av. Central',
        tipoInspecao: 'Inspeção de Luminárias',
        responsavel: 'Mariana Costa',
        matricula: 'ENG-3310',
        observacaoGeral: 'Substituição de luminárias por modelo LED de alta eficiência. Teste de acendimento realizado com sucesso.',
        localizacao: {
          latitude: -22.906847,
          longitude: -43.172896,
          precisao: 12,
          dataCaptura: '25/08/2026 às 09:35',
          endereco: 'Rua Primeiro de Março, Centro, Rio de Janeiro - RJ',
        },
        fotos: [],
        sincronizado: true,
        versaoApp: '2.0.0',
      },
    ],
    inspectionTypes: DEFAULT_INSPECTION_TYPES,
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving initial database file:', err);
  }

  return initialDb;
}

let dbMemory: DatabaseSchema = initializeDatabase();

// Connected real-time SSE clients
const sseClients = new Set<express.Response>();

function broadcastRealtimeUpdate(event: string, payload: any): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

// Keep-alive heartbeat every 15s so proxies/browsers keep the SSE stream open
setInterval(() => {
  if (sseClients.size > 0) {
    const pingMessage = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.write(pingMessage);
      } catch (e) {
        sseClients.delete(client);
      }
    });
  }
}, 15000);

function persistDatabase(): void {
  try {
    dbMemory.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to database file:', err);
  }
}

async function startServer() {
  const app = express();

  // Allow large payloads for high-resolution base64 inspection photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers for multi-device/embedded access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // SSE Real-Time Event Stream for Instant Multi-Browser Sync
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ total: dbMemory.inspections.length, timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // API: Get all inspections from central system database
  app.get('/api/inspections', (req, res) => {
    res.json({
      success: true,
      total: dbMemory.inspections.length,
      inspections: dbMemory.inspections,
      lastUpdated: dbMemory.lastUpdated,
    });
  });

  // API: Save or update an inspection in central system database
  app.post('/api/inspections', (req, res) => {
    try {
      const inspection: Inspection = req.body;
      if (!inspection || !inspection.id) {
        res.status(400).json({ success: false, error: 'Dados de inspeção inválidos' });
        return;
      }

      const existingIndex = dbMemory.inspections.findIndex(
        (item) => item.id === inspection.id || (inspection.uuid && item.uuid === inspection.uuid)
      );

      if (existingIndex >= 0) {
        dbMemory.inspections[existingIndex] = { ...inspection, sincronizado: true };
      } else {
        dbMemory.inspections.unshift({ ...inspection, sincronizado: true });
      }

      persistDatabase();

      const savedItem = existingIndex >= 0 ? dbMemory.inspections[existingIndex] : dbMemory.inspections[0];

      // Broadcast real-time change to all connected browsers & devices immediately
      broadcastRealtimeUpdate('database_update', {
        action: existingIndex >= 0 ? 'update' : 'create',
        inspectionId: savedItem.id,
        inspection: savedItem,
        inspections: dbMemory.inspections,
        total: dbMemory.inspections.length,
        lastUpdated: dbMemory.lastUpdated,
      });

      res.json({
        success: true,
        message: 'Inspeção gravada com sucesso no banco de dados central do sistema',
        inspection: savedItem,
        total: dbMemory.inspections.length,
      });
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      res.status(500).json({ success: false, error: err.message || 'Erro interno ao salvar inspeção' });
    }
  });

  // API: Delete an inspection from central database
  app.delete('/api/inspections/:id', (req, res) => {
    try {
      const { id } = req.params;
      const initialCount = dbMemory.inspections.length;
      dbMemory.inspections = dbMemory.inspections.filter((item) => item.id !== id && item.uuid !== id);

      if (dbMemory.inspections.length !== initialCount) {
        persistDatabase();

        // Broadcast real-time deletion to all connected browsers & devices immediately
        broadcastRealtimeUpdate('database_update', {
          action: 'delete',
          deletedId: id,
          inspections: dbMemory.inspections,
          total: dbMemory.inspections.length,
          lastUpdated: dbMemory.lastUpdated,
        });
      }

      res.json({
        success: true,
        message: `Inspeção ${id} removida com sucesso`,
        total: dbMemory.inspections.length,
      });
    } catch (err: any) {
      console.error('Error deleting inspection:', err);
      res.status(500).json({ success: false, error: err.message || 'Erro interno ao excluir' });
    }
  });

  // API: Get inspection types
  app.get('/api/types', (req, res) => {
    res.json({
      success: true,
      types: dbMemory.inspectionTypes || DEFAULT_INSPECTION_TYPES,
    });
  });

  // API: Add custom inspection type
  app.post('/api/types', (req, res) => {
    try {
      const { type } = req.body;
      if (type && typeof type === 'string' && !dbMemory.inspectionTypes.includes(type.trim())) {
        dbMemory.inspectionTypes.push(type.trim());
        persistDatabase();

        broadcastRealtimeUpdate('types_update', {
          types: dbMemory.inspectionTypes,
        });
      }
      res.json({
        success: true,
        types: dbMemory.inspectionTypes,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Export database backup
  app.get('/api/backup', (req, res) => {
    res.json({
      appName: 'INSPEÇÃO PRONTO!',
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      inspections: dbMemory.inspections,
      inspectionTypes: dbMemory.inspectionTypes,
    });
  });

  // API: Import / Restore database backup
  app.post('/api/backup', (req, res) => {
    try {
      const { inspections, inspectionTypes } = req.body;
      if (!Array.isArray(inspections)) {
        res.status(400).json({ success: false, error: 'Lista de inspeções inválida no backup' });
        return;
      }

      const map = new Map<string, Inspection>();
      // Retain existing or merge
      dbMemory.inspections.forEach((i) => map.set(i.id, i));
      inspections.forEach((i: Inspection) => {
        if (i && i.id) map.set(i.id, { ...i, sincronizado: true });
      });

      dbMemory.inspections = Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
      if (Array.isArray(inspectionTypes)) {
        dbMemory.inspectionTypes = inspectionTypes;
      }

      persistDatabase();

      // Broadcast restored database to all connected clients
      broadcastRealtimeUpdate('database_update', {
        action: 'restore',
        inspections: dbMemory.inspections,
        total: dbMemory.inspections.length,
        lastUpdated: dbMemory.lastUpdated,
      });

      res.json({
        success: true,
        count: dbMemory.inspections.length,
        message: 'Banco de dados central restaurado com sucesso',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Erro ao importar backup' });
    }
  });

  // API: Health / System status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      mode: 'system_internal_database',
      totalInspections: dbMemory.inspections.length,
      lastUpdated: dbMemory.lastUpdated,
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development vs Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INSPEÇÃO PRONTO!] Central server with internal database running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
