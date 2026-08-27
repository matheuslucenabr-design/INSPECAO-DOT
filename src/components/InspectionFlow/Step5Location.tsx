import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, RefreshCw, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight, ShieldAlert, Eye } from 'lucide-react';
import { GPSLocation } from '../../types/inspection';
import { captureCurrentLocation, getMapsUrl, getOsmEmbedUrl } from '../../utils/geo';

interface Step5Props {
  localizacao?: GPSLocation;
  onChange: (loc?: GPSLocation) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step5Location: React.FC<Step5Props> = ({
  localizacao,
  onChange,
  onNext,
  onPrev,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMapEmbed, setShowMapEmbed] = useState(false);

  const handleCaptureLocation = async () => {
    setIsCapturing(true);
    setErrorMsg(null);

    const result = await captureCurrentLocation();
    setIsCapturing(false);

    if (result.success && result.location) {
      onChange(result.location);
    } else {
      setErrorMsg(result.error || 'Falha ao obter sinal de geolocalização.');
    }
  };

  const handleSkipLocation = () => {
    const fallbackLoc: GPSLocation = {
      latitude: 0,
      longitude: 0,
      precisao: 0,
      dataCaptura: new Date().toLocaleDateString('pt-BR'),
      semGps: true,
      endereco: 'Não registrado (dispensado em campo)',
    };
    onChange(fallbackLoc);
    onNext();
  };

  const hasValidGps = localizacao && !localizacao.semGps;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-[#0A1D3D] border border-[#12346B] rounded-none p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-[#12346B] pb-4">
          <div className="flex items-center gap-2.5 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4" />
            <span>ETAPA 5</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#FFFFFF]">
            LOCALIZAÇÃO DA INSPEÇÃO (GPS)
          </h2>
          <p className="text-xs text-[#A7B0C2] mt-1">
            Registre as coordenadas geográficas exatas do ponto inspecionado.
          </p>
        </div>

        {/* Action Button: Registrar Localização */}
        <div>
          <button
            type="button"
            disabled={isCapturing}
            onClick={handleCaptureLocation}
            className="w-full py-4 px-4 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 cursor-pointer border border-[#A7B0C2]/30"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-[#FFFFFF]" />
                <span>OBTENDO COORDENADAS GPS...</span>
              </>
            ) : hasValidGps ? (
              <>
                <RefreshCw className="w-5 h-5 text-[#FFFFFF]" />
                <span>ATUALIZAR LOCALIZAÇÃO GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5 text-[#FFFFFF]" />
                <span>REGISTRAR LOCALIZAÇÃO GPS</span>
              </>
            )}
          </button>
        </div>

        {/* Error State Banner with Skip Action */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-none p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Não foi possível obter sua localização:</p>
                <p className="mt-1 text-rose-300">{errorMsg}</p>
                <ul className="list-disc list-inside mt-2 text-[11px] text-rose-300 space-y-0.5">
                  <li>Verifique se o GPS está ativado nas configurações do celular</li>
                  <li>Conceda permissão de localização ao navegador</li>
                  <li>Em áreas subterrâneas ou galpões metálicos, o sinal pode estar indisponível</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-rose-800/80">
              <button
                type="button"
                onClick={handleCaptureLocation}
                className="py-2 px-3 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-none text-xs cursor-pointer"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleSkipLocation}
                className="py-2 px-3 bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-semibold rounded-none text-xs border border-[#A7B0C2]/30 cursor-pointer"
              >
                Continuar sem localização
              </button>
            </div>
          </div>
        )}

        {/* Successful GPS Display */}
        {hasValidGps && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FFFFFF] font-bold text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Localização registrada com sucesso</span>
              </div>
              <span className="text-[11px] text-[#A7B0C2]">
                Precisão: <strong className="text-[#FFFFFF]">±{localizacao.precisao}m</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-[#0A1D3D] p-2.5 rounded-none border border-[#12346B]">
                <span className="text-[#A7B0C2] block text-[10px] uppercase font-semibold">Latitude</span>
                <span className="font-mono font-bold text-[#FFFFFF]">{localizacao.latitude.toFixed(6)}°</span>
              </div>
              <div className="bg-[#0A1D3D] p-2.5 rounded-none border border-[#12346B]">
                <span className="text-[#A7B0C2] block text-[10px] uppercase font-semibold">Longitude</span>
                <span className="font-mono font-bold text-[#FFFFFF]">{localizacao.longitude.toFixed(6)}°</span>
              </div>
            </div>

            {localizacao.endereco && (
              <div className="text-xs bg-[#0A1D3D] p-2.5 rounded-none border border-[#12346B]">
                <span className="text-[#A7B0C2] block text-[10px] uppercase font-semibold">Endereço Identificado</span>
                <p className="text-[#FFFFFF] mt-0.5 leading-relaxed">{localizacao.endereco}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowMapEmbed(!showMapEmbed)}
                className="text-xs text-[#FFFFFF] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showMapEmbed ? 'Ocultar mapa interativo' : 'Ver mapa aqui'}</span>
              </button>

              <a
                href={getMapsUrl(localizacao.latitude, localizacao.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#A7B0C2] hover:text-[#FFFFFF] font-semibold flex items-center gap-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Embedded interactive map */}
            {showMapEmbed && (
              <div className="mt-2 h-48 w-full rounded-none overflow-hidden border border-[#12346B]">
                <iframe
                  title="Localização da Inspeção"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={getOsmEmbedUrl(localizacao.latitude, localizacao.longitude)}
                />
              </div>
            )}
          </div>
        )}

        {/* Skipped GPS Status Notice */}
        {localizacao?.semGps && (
          <div className="bg-[#0F1726] border border-[#12346B] rounded-none p-3.5 flex items-center gap-3 text-xs text-[#FFFFFF]">
            <ShieldAlert className="w-5 h-5 text-[#FFFFFF] shrink-0" />
            <div>
              <p className="font-bold">Inspeção sem registro de GPS</p>
              <p className="text-[11px] text-[#A7B0C2]">
                O registro será gravado com marcação de ausência de sinal georreferenciado.
              </p>
            </div>
          </div>
        )}

        {/* Option to proceed without GPS if not captured yet */}
        {!hasValidGps && !localizacao?.semGps && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleSkipLocation}
              className="text-xs text-[#A7B0C2] hover:text-[#FFFFFF] underline underline-offset-4 font-medium cursor-pointer"
            >
              Continuar sem registrar localização GPS
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="py-3 px-5 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#A7B0C2]/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="py-3.5 px-6 rounded-none bg-[#12346B] hover:bg-[#12346B]/80 text-[#FFFFFF] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer border border-[#A7B0C2]/30"
        >
          <span>PRÓXIMA ETAPA: REVISÃO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
