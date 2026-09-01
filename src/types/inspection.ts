export type InspectionStatus = 'rascunho' | 'processando' | 'concluida';

export interface InspectionPhoto {
  id: string;
  numero: number;
  dataUrl: string; // Base64 compressed image (1920x1080 max, 80-85% quality)
  legenda: string;
  dataUpload: string;
  largura?: number;
  altura?: number;
  tamanhoKb?: number;
  nomeArquivo?: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  precisao: number; // in meters
  dataCaptura: string;
  endereco?: string;
  semGps?: boolean;
}

export interface Inspection {
  id: string; // Unique non-colliding registration ID (e.g. REG-XXXX-XXXX)
  uuid: string; // internal unique key for deduplication
  status: InspectionStatus;
  dataCriacao: string;
  dataEnvio?: string;
  timestamp?: number; // Millisecond timestamp for chronological sorting
  createdAt?: string;
  updatedAt?: string;
  
  // Etapa 1: Identificação
  obra: string;
  equipe: string;
  tecnicoResponsavel: string;
  local: string;
  
  // Etapa 2: Tipo
  tipoInspecao: string;
  
  // Etapa 3: Fotos
  fotos: InspectionPhoto[];
  
  // Etapa 4: Responsável & Observações
  responsavel: string;
  matricula?: string;
  observacaoGeral?: string;
  
  // Etapa 5: Localização
  localizacao?: GPSLocation;
  
  // Sala / Room ID central
  roomId?: string;
  sala?: string;
  
  // Metadados
  criadoPor?: string;
  versaoApp?: string;
  sincronizado?: boolean;
}

export interface InspectionRoom {
  id: string; // e.g. "tecnico@inspecaopronto.com"
  name: string;
  email: string;
  createdAt: string;
  description?: string;
  isDefault?: boolean;
  totalInspections?: number;
}

export type InspectionStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface FilterOptions {
  periodo: 'todos' | 'hoje' | '7dias' | '30dias' | 'este_mes' | 'personalizado';
  dataInicio?: string;
  dataFim?: string;
  tipoInspecao?: string;
  obra?: string;
  equipe?: string;
  tecnico?: string;
  responsavel?: string;
  local?: string;
  status?: string;
}

export interface InspectionStats {
  total: number;
  hoje: number;
  esteMes: number;
  emAndamento: number;
  concluidas: number;
}
