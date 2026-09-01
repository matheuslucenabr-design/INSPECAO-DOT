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
  roomId?: string;
  sala?: string;
  status: 'rascunho' | 'processando' | 'concluida' | 'sincronizada';
  dataCriacao: string;
  dataEnvio?: string;
  timestamp?: number;
  createdAt?: string;
  updatedAt?: string;
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

export interface InspectionRoom {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  description?: string;
  isDefault?: boolean;
  totalInspections?: number;
}

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const DEFAULT_ROOM_ID = 'tecnico@inspecaopronto.com';

const DEFAULT_ROOMS: InspectionRoom[] = [
  {
    id: DEFAULT_ROOM_ID,
    name: 'Sala Principal - Técnico',
    email: DEFAULT_ROOM_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    isDefault: true,
    description: 'Sala unificada central do sistema para compartilhamento de todas as inspeções',
  },
];

const DEFAULT_INSPECTION_TYPES = [
  'Inspeção Pós-Serviço',
  'Inspeção de Atividades',
  'Inspeção de Luminárias',
  'Inspeção de Redes',
  'Inspeção de Redes Compartilhadas',
  'Inspeção de 5S',
];

interface DatabaseSchema {
  rooms?: InspectionRoom[];
  inspections: Inspection[];
  inspectionTypes: string[];
  deletedIds: string[];
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
        const deletedSet = new Set<string>(Array.isArray(parsed.deletedIds) ? parsed.deletedIds : []);

        // Filter out any mock/seed inspections and deleted records
        parsed.inspections = parsed.inspections.filter(
          (insp: any) =>
            insp.id !== 'REG-2026-SE01-A1' &&
            insp.id !== 'REG-2026-SE02-B2' &&
            insp.uuid !== 'seed-uuid-1' &&
            insp.uuid !== 'seed-uuid-2' &&
            !deletedSet.has(insp.id) &&
            !deletedSet.has(insp.uuid)
        );

        // Ensure every inspection has a roomId
        parsed.inspections.forEach((insp: Inspection) => {
          if (!insp.roomId) {
            insp.roomId = DEFAULT_ROOM_ID;
            insp.sala = DEFAULT_ROOM_ID;
          }
        });

        // Ensure rooms list exists and contains default room
        if (!Array.isArray(parsed.rooms) || parsed.rooms.length === 0) {
          parsed.rooms = [...DEFAULT_ROOMS];
        } else if (!parsed.rooms.some((r: InspectionRoom) => r.id === DEFAULT_ROOM_ID)) {
          parsed.rooms.unshift(DEFAULT_ROOMS[0]);
        }

        parsed.deletedIds = Array.from(deletedSet);
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  // Clean empty state ready for production use
  const initialDb: DatabaseSchema = {
    rooms: [...DEFAULT_ROOMS],
    inspections: [],
    inspectionTypes: DEFAULT_INSPECTION_TYPES,
    deletedIds: [],
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

  // API: Get all registered rooms
  app.get('/api/rooms', (req, res) => {
    if (!dbMemory.rooms || dbMemory.rooms.length === 0) {
      dbMemory.rooms = [...DEFAULT_ROOMS];
    }

    // Calculate real-time count of active inspections in each room
    const countsMap = new Map<string, number>();
    dbMemory.inspections.forEach((insp) => {
      const rId = (insp.roomId || DEFAULT_ROOM_ID).toLowerCase();
      countsMap.set(rId, (countsMap.get(rId) || 0) + 1);
    });

    const enrichedRooms = dbMemory.rooms.map((room) => ({
      ...room,
      totalInspections: countsMap.get(room.id.toLowerCase()) || 0,
    }));

    res.json({
      success: true,
      defaultRoomId: DEFAULT_ROOM_ID,
      rooms: enrichedRooms,
    });
  });

  // API: Register a new inspection room
  app.post('/api/rooms', (req, res) => {
    try {
      const { id, name, email, description } = req.body;
      const rawId = (id || email || '').trim().toLowerCase();
      if (!rawId) {
        res.status(400).json({ success: false, error: 'Identificador ou e-mail da sala é obrigatório' });
        return;
      }

      if (!dbMemory.rooms) dbMemory.rooms = [...DEFAULT_ROOMS];
      
      const existing = dbMemory.rooms.find((r) => r.id.toLowerCase() === rawId);
      if (existing) {
        res.json({
          success: true,
          message: 'Sala já cadastrada',
          room: existing,
          rooms: dbMemory.rooms,
        });
        return;
      }

      const newRoom: InspectionRoom = {
        id: rawId,
        email: email ? email.trim() : rawId,
        name: name ? name.trim() : `Sala ${rawId}`,
        description: description ? description.trim() : 'Sala de inspeções',
        createdAt: new Date().toISOString(),
        isDefault: rawId === DEFAULT_ROOM_ID.toLowerCase(),
      };

      dbMemory.rooms.push(newRoom);
      persistDatabase();

      broadcastRealtimeUpdate('rooms_update', {
        rooms: dbMemory.rooms,
        defaultRoomId: DEFAULT_ROOM_ID,
      });

      res.json({
        success: true,
        message: `Sala ${newRoom.id} criada com sucesso`,
        room: newRoom,
        rooms: dbMemory.rooms,
      });
    } catch (err: any) {
      console.error('Error creating room:', err);
      res.status(500).json({ success: false, error: err.message || 'Erro ao criar sala' });
    }
  });

  // API: Get all inspections and deleted IDs from central system database (filtered by room if specified)
  app.get('/api/inspections', (req, res) => {
    const requestedRoom = (req.query.room as string || req.headers['x-room-id'] as string || '').trim().toLowerCase();
    
    let filteredInspections = dbMemory.inspections;
    if (requestedRoom && requestedRoom !== 'all') {
      filteredInspections = dbMemory.inspections.filter((insp) => {
        const itemRoom = (insp.roomId || insp.sala || DEFAULT_ROOM_ID).toLowerCase();
        return itemRoom === requestedRoom;
      });
    }

    res.json({
      success: true,
      room: requestedRoom || DEFAULT_ROOM_ID,
      total: filteredInspections.length,
      inspections: filteredInspections,
      deletedIds: dbMemory.deletedIds || [],
      lastUpdated: dbMemory.lastUpdated,
    });
  });

  // API: Get deleted inspection IDs
  app.get('/api/deleted-ids', (req, res) => {
    res.json({
      success: true,
      deletedIds: dbMemory.deletedIds || [],
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

      // Assign room
      const targetRoom = (inspection.roomId || inspection.sala || (req.query.room as string) || DEFAULT_ROOM_ID).trim().toLowerCase();
      inspection.roomId = targetRoom;
      inspection.sala = targetRoom;

      // Ensure room exists in dbMemory.rooms
      if (!dbMemory.rooms) dbMemory.rooms = [...DEFAULT_ROOMS];
      if (!dbMemory.rooms.some((r) => r.id.toLowerCase() === targetRoom)) {
        dbMemory.rooms.push({
          id: targetRoom,
          email: targetRoom,
          name: `Sala ${targetRoom}`,
          createdAt: new Date().toISOString(),
          isDefault: targetRoom === DEFAULT_ROOM_ID.toLowerCase(),
        });
      }

      // If user submits a newly saved inspection, ensure it is no longer marked deleted
      if (dbMemory.deletedIds) {
        dbMemory.deletedIds = dbMemory.deletedIds.filter(
          (dId) => dId !== inspection.id && dId !== inspection.uuid
        );
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
        roomId: savedItem.roomId,
        inspectionId: savedItem.id,
        inspection: savedItem,
        inspections: dbMemory.inspections,
        deletedIds: dbMemory.deletedIds,
        total: dbMemory.inspections.length,
        lastUpdated: dbMemory.lastUpdated,
      });

      res.json({
        success: true,
        message: 'Inspeção gravada com sucesso no banco de dados central do sistema',
        room: savedItem.roomId,
        inspection: savedItem,
        total: dbMemory.inspections.length,
      });
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      res.status(500).json({ success: false, error: err.message || 'Erro interno ao salvar inspeção' });
    }
  });

  // API: Delete an inspection permanently from central database
  app.delete('/api/inspections/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      // Collect IDs to mark as permanently deleted
      const matched = dbMemory.inspections.find((item) => item.id === id || item.uuid === id);
      const toDeleteIds = new Set<string>([id]);
      if (matched) {
        if (matched.id) toDeleteIds.add(matched.id);
        if (matched.uuid) toDeleteIds.add(matched.uuid);
      }

      if (!dbMemory.deletedIds) dbMemory.deletedIds = [];
      toDeleteIds.forEach((dId) => {
        if (!dbMemory.deletedIds.includes(dId)) {
          dbMemory.deletedIds.push(dId);
        }
      });

      dbMemory.inspections = dbMemory.inspections.filter(
        (item) => !toDeleteIds.has(item.id) && (!item.uuid || !toDeleteIds.has(item.uuid))
      );

      persistDatabase();

      // Broadcast real-time deletion to all connected browsers & devices immediately
      broadcastRealtimeUpdate('database_update', {
        action: 'delete',
        deletedId: id,
        deletedIds: dbMemory.deletedIds,
        inspections: dbMemory.inspections,
        total: dbMemory.inspections.length,
        lastUpdated: dbMemory.lastUpdated,
      });

      res.json({
        success: true,
        message: `Inspeção ${id} removida permanentemente com sucesso`,
        deletedIds: dbMemory.deletedIds,
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

  // API: Full Multiplatform Synchronization Endpoint
  app.post('/api/sync', (req, res) => {
    try {
      const { inspections, deletedIds, room } = req.body;
      const targetRoom = (room || (req.query.room as string) || '').trim().toLowerCase();
      
      // 1. Process and record any deletion tombstones
      if (Array.isArray(deletedIds)) {
        if (!dbMemory.deletedIds) dbMemory.deletedIds = [];
        deletedIds.forEach((dId: string) => {
          if (dId && typeof dId === 'string' && !dbMemory.deletedIds.includes(dId)) {
            dbMemory.deletedIds.push(dId);
          }
        });
      }

      const deletedSet = new Set<string>(dbMemory.deletedIds || []);

      // 2. Filter existing database with deletedSet
      dbMemory.inspections = dbMemory.inspections.filter(
        (item) => !deletedSet.has(item.id) && (!item.uuid || !deletedSet.has(item.uuid))
      );

      // 3. Merge incoming inspections that are not deleted
      let hasChanges = false;
      if (Array.isArray(inspections)) {
        const map = new Map<string, Inspection>();
        dbMemory.inspections.forEach((i) => map.set(i.id, i));

        for (const item of inspections) {
          if (!item || !item.id || deletedSet.has(item.id) || (item.uuid && deletedSet.has(item.uuid))) {
            continue;
          }

          const itemRoom = (item.roomId || item.sala || targetRoom || DEFAULT_ROOM_ID).toLowerCase();
          const cleanItem = {
            ...item,
            roomId: itemRoom,
            sala: itemRoom,
            sincronizado: true,
          };

          if (!map.has(cleanItem.id)) {
            map.set(cleanItem.id, cleanItem);
            hasChanges = true;
          } else {
            const existing = map.get(cleanItem.id)!;
            const existingTime = existing.updatedAt || existing.dataEnvio || existing.dataCriacao || '';
            const incomingTime = cleanItem.updatedAt || cleanItem.dataEnvio || cleanItem.dataCriacao || '';
            if (incomingTime >= existingTime || (cleanItem.fotos?.length || 0) > (existing.fotos?.length || 0)) {
              map.set(cleanItem.id, cleanItem);
              hasChanges = true;
            }
          }
        }

        dbMemory.inspections = Array.from(map.values()).sort((a, b) => {
          const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return (timeB || 0) - (timeA || 0) || b.id.localeCompare(a.id);
        });
      }

      if (hasChanges || (Array.isArray(deletedIds) && deletedIds.length > 0)) {
        persistDatabase();
        broadcastRealtimeUpdate('database_update', {
          action: 'sync',
          roomId: targetRoom || DEFAULT_ROOM_ID,
          inspections: dbMemory.inspections,
          deletedIds: dbMemory.deletedIds,
          total: dbMemory.inspections.length,
          lastUpdated: dbMemory.lastUpdated,
        });
      }

      const filteredForResponse = targetRoom && targetRoom !== 'all'
        ? dbMemory.inspections.filter((i) => (i.roomId || i.sala || DEFAULT_ROOM_ID).toLowerCase() === targetRoom)
        : dbMemory.inspections;

      res.json({
        success: true,
        room: targetRoom || DEFAULT_ROOM_ID,
        inspections: filteredForResponse,
        deletedIds: dbMemory.deletedIds || [],
        total: filteredForResponse.length,
        totalAllRooms: dbMemory.inspections.length,
        lastUpdated: dbMemory.lastUpdated,
        message: 'Sincronização multiplataforma concluída com sucesso',
      });
    } catch (err: any) {
      console.error('Error during /api/sync:', err);
      res.status(500).json({ success: false, error: err.message || 'Erro durante sincronização' });
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
