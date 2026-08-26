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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4" />
            <span>ETAPA 5</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100">
            LOCALIZAÇÃO DA INSPEÇÃO (GPS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registre as coordenadas geográficas exatas do ponto inspecionado.
          </p>
        </div>

        {/* Action Button: Registrar Localização */}
        <div>
          <button
            type="button"
            disabled={isCapturing}
            onClick={handleCaptureLocation}
            className="w-full py-4 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-sky-950/60 transition-all active:scale-98 cursor-pointer"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>OBTENDO COORDENADAS GPS...</span>
              </>
            ) : hasValidGps ? (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>ATUALIZAR LOCALIZAÇÃO GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                <span>REGISTRAR LOCALIZAÇÃO GPS</span>
              </>
            )}
          </button>
        </div>

        {/* Error State Banner with Skip Action */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-4 space-y-3">
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
                className="py-2 px-3 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg text-xs"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleSkipLocation}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700"
              >
                Continuar sem localização
              </button>
            </div>
          </div>
        )}

        {/* Successful GPS Display */}
        {hasValidGps && (
          <div className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Localização registrada com sucesso</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Precisão: <strong className="text-emerald-400">±{localizacao.precisao}m</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Latitude</span>
                <span className="font-mono font-bold text-slate-100">{localizacao.latitude.toFixed(6)}°</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Longitude</span>
                <span className="font-mono font-bold text-slate-100">{localizacao.longitude.toFixed(6)}°</span>
              </div>
            </div>

            {localizacao.endereco && (
              <div className="text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Endereço Identificado</span>
                <p className="text-slate-200 mt-0.5 leading-relaxed">{localizacao.endereco}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowMapEmbed(!showMapEmbed)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showMapEmbed ? 'Ocultar mapa interativo' : 'Ver mapa aqui'}</span>
              </button>

              <a
                href={getMapsUrl(localizacao.latitude, localizacao.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Embedded interactive map */}
            {showMapEmbed && (
              <div className="mt-2 h-48 w-full rounded-lg overflow-hidden border border-slate-700">
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
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 flex items-center gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">Inspeção sem registro de GPS</p>
              <p className="text-[11px] text-slate-400">
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
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 font-medium"
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
          className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950 transition-all active:scale-98 cursor-pointer"
        >
          <span>PRÓXIMA ETAPA: REVISÃO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
