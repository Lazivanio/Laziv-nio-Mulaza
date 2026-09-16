import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Coins, 
  Banknote, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Plus, 
  Minus, 
  Sparkles,
  Lock,
  ArrowRight,
  Calculator,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Scale,
  Printer,
  Wallet,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  DenominationBreakdown, 
  EMPTY_DENOMINATIONS, 
  NOTE_VALUES, 
  COIN_VALUES, 
  calculateDenominationsTotal,
  decomposeAmountToBreakdown,
  DenominationHistoryEntry,
  computeSummaryByDenomination
} from '../lib/cashDenominations';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface CashRegisterDenominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  registerName: string;
  registerId: number;
  targetOpeningAmount: number;
  onConfirmOpen: (breakdown: DenominationBreakdown, total: number) => Promise<void>;
  isSubmitting?: boolean;
}

export const CashRegisterDenominationModal: React.FC<CashRegisterDenominationModalProps> = ({
  isOpen,
  onClose,
  registerName,
  registerId,
  targetOpeningAmount,
  onConfirmOpen,
  isSubmitting = false
}) => {
  const [breakdown, setBreakdown] = useState<DenominationBreakdown>(EMPTY_DENOMINATIONS);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      // If target amount matches a single note, pre-suggest or start fresh
      setBreakdown({
        notes: { '200': 0, '500': 0, '1000': 0, '2000': 0, '5000': 0 },
        coins: { '10': 0, '20': 0, '50': 0, '100': 0, '200': 0 }
      });
    }
  }, [isOpen, targetOpeningAmount]);

  const currentTotal = useMemo(() => calculateDenominationsTotal(breakdown), [breakdown]);
  const difference = currentTotal - targetOpeningAmount;
  const isExact = targetOpeningAmount === 0 ? currentTotal === 0 : difference === 0;
  const isUnder = difference < 0;
  const isOver = difference > 0;

  const notesTotal = useMemo(() => {
    let t = 0;
    for (const [v, c] of Object.entries(breakdown.notes)) {
      t += Number(v) * Number(c || 0);
    }
    return t;
  }, [breakdown.notes]);

  const coinsTotal = useMemo(() => {
    let t = 0;
    for (const [v, c] of Object.entries(breakdown.coins)) {
      t += Number(v) * Number(c || 0);
    }
    return t;
  }, [breakdown.coins]);

  const updateCount = (type: 'notes' | 'coins', valueKey: string, delta: number) => {
    setBreakdown(prev => {
      const current = (prev[type] as any)[valueKey] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [type]: {
          ...prev[type],
          [valueKey]: next
        }
      };
    });
  };

  const setCountDirect = (type: 'notes' | 'coins', valueKey: string, count: number) => {
    const validCount = Math.max(0, isNaN(count) ? 0 : Math.floor(count));
    setBreakdown(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [valueKey]: validCount
      }
    }));
  };

  const handleReset = () => {
    setBreakdown({
      notes: { '200': 0, '500': 0, '1000': 0, '2000': 0, '5000': 0 },
      coins: { '10': 0, '20': 0, '50': 0, '100': 0, '200': 0 }
    });
  };

  // Helper: set single note to match target
  const fillSingleNote = (value: number) => {
    const count = Math.floor(targetOpeningAmount / value);
    if (count <= 0) return;
    setBreakdown({
      notes: {
        '200': value === 200 ? count : 0,
        '500': value === 500 ? count : 0,
        '1000': value === 1000 ? count : 0,
        '2000': value === 2000 ? count : 0,
        '5000': value === 5000 ? count : 0,
      },
      coins: { '10': 0, '20': 0, '50': 0, '100': 0, '200': 0 }
    });
  };

  const handleConfirm = async () => {
    if (!isExact && targetOpeningAmount > 0) return;
    await onConfirmOpen(breakdown, currentTotal);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-200">
              <Banknote size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 leading-tight">
                Abertura de Caixa — Escolher Cédulas & Moedas
              </h2>
              <p className="text-xs font-semibold text-zinc-500">
                Caixa: <span className="font-bold text-zinc-800">{registerName}</span> (ID: #{registerId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* SUMMARY BALANCE BAR */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Valor de Abertura Informado</span>
              <span className="text-xl font-black text-white">
                Kz {targetOpeningAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-700 hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total em Cédulas & Moedas</span>
              <span className={`text-xl font-black ${isExact ? 'text-emerald-400' : isOver ? 'text-rose-400' : 'text-amber-400'}`}>
                Kz {currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {targetOpeningAmount > 0 && (
              <button
                type="button"
                onClick={() => setBreakdown(decomposeAmountToBreakdown(targetOpeningAmount))}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-orange-900/30"
                title="Preencher automaticamente as cédulas e moedas para atingir exatamente o valor pretendido"
              >
                <Sparkles size={13} />
                Sugerir Moedas
              </button>
            )}

            {targetOpeningAmount > 0 && targetOpeningAmount % 5000 === 0 && (
              <button
                onClick={() => fillSingleNote(5000)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-400" />
                {targetOpeningAmount === 5000 ? '1x Nota 5.000 Kz' : `${targetOpeningAmount / 5000}x Notas 5.000 Kz`}
              </button>
            )}

            {targetOpeningAmount > 0 && targetOpeningAmount % 2000 === 0 && targetOpeningAmount !== 5000 && (
              <button
                onClick={() => fillSingleNote(2000)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-400" />
                {targetOpeningAmount === 2000 ? '1x Nota 2.000 Kz' : `${targetOpeningAmount / 2000}x Notas 2.000 Kz`}
              </button>
            )}

            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 transition-all flex items-center gap-1"
            >
              <RotateCcw size={13} />
              Limpar
            </button>
          </div>
        </div>

        {/* STATUS ALERT NOTIFICATION */}
        <div className="px-6 py-2.5">
          {isExact ? (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-sm font-bold">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>
                Valores conferidos com sucesso! As cédulas e moedas totalizam exatamente <strong>Kz {currentTotal.toLocaleString()}</strong>.
              </span>
            </div>
          ) : isUnder ? (
            <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2.5 text-amber-900 text-sm">
              <div className="flex items-center gap-2.5 font-bold">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>
                  Faltam <strong>Kz {Math.abs(difference).toLocaleString()}</strong> para atingir o valor de abertura (Kz {targetOpeningAmount.toLocaleString()}).
                </span>
              </div>
              <span className="text-xs text-amber-700 font-medium">Adicione as notas ou moedas correspondentes abaixo.</span>
            </div>
          ) : (
            <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-sm font-bold">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <span>
                Ultrapassou em <strong>Kz {difference.toLocaleString()}</strong> o valor de abertura informado! Reduza a quantidade de cédulas ou moedas.
              </span>
            </div>
          )}
        </div>

        {/* MODAL BODY (THE 10 COLUMNS: 5 NOTES TOP, 5 COINS BOTTOM) */}
        <div className="px-6 py-2 overflow-y-auto space-y-6 flex-1">
          
          {/* SECTION 1: AS 5 PRIMEIRAS COLUNAS - NOTAS */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-md tracking-wider">
                  5 Cédulas / Notas
                </span>
                <span className="text-xs font-bold text-zinc-500">Notas oficiais de Angola</span>
              </div>
              <span className="text-xs font-black text-emerald-700">
                Subtotal Notas: Kz {notesTotal.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {NOTE_VALUES.map(val => {
                const valKey = String(val);
                const count = (breakdown.notes as any)[valKey] || 0;
                const subtotal = count * val;

                return (
                  <div 
                    key={`note-${val}`}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      count > 0 
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-sm ring-1 ring-emerald-300' 
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {/* Header: Label & Subtotal */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                          Nota
                        </span>
                        {targetOpeningAmount === val && count === 0 && (
                          <button
                            onClick={() => fillSingleNote(val)}
                            className="text-[9px] font-bold text-emerald-700 hover:underline"
                            title="Preencher com nota única"
                          >
                            Nota Única
                          </button>
                        )}
                      </div>
                      <div className="text-base font-black text-zinc-900 tracking-tight">
                        {val.toLocaleString()} Kz
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700 mb-2">
                        = Kz {subtotal.toLocaleString()}
                      </div>
                    </div>

                    {/* Controls: Stepper */}
                    <div>
                      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl p-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => updateCount('notes', valKey, -1)}
                          disabled={count <= 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95 transition-all"
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={count === 0 ? '' : count}
                          onChange={e => setCountDirect('notes', valKey, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-12 text-center font-black text-zinc-900 text-sm outline-none bg-transparent"
                        />

                        <button
                          type="button"
                          onClick={() => updateCount('notes', valKey, 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all font-bold"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Quick addition buttons */}
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => updateCount('notes', valKey, 1)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCount('notes', valKey, 5)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCount('notes', valKey, 10)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: AS 5 INFERIORES COLUNAS - MOEDAS */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-md tracking-wider">
                  5 Moedas Metálicas
                </span>
                <span className="text-xs font-bold text-zinc-500">Moedas oficiais de Angola</span>
              </div>
              <span className="text-xs font-black text-amber-700">
                Subtotal Moedas: Kz {coinsTotal.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {COIN_VALUES.map(val => {
                const valKey = String(val);
                const count = (breakdown.coins as any)[valKey] || 0;
                const subtotal = count * val;

                return (
                  <div 
                    key={`coin-${val}`}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      count > 0 
                        ? 'bg-amber-50/50 border-amber-300 shadow-sm ring-1 ring-amber-300' 
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {/* Header: Label & Subtotal */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-600 text-white shadow-xs">
                          Moeda
                        </span>
                        {targetOpeningAmount === val && count === 0 && (
                          <button
                            onClick={() => {
                              setBreakdown(prev => ({
                                ...prev,
                                coins: { ...prev.coins, [valKey]: 1 }
                              }));
                            }}
                            className="text-[9px] font-bold text-amber-700 hover:underline"
                          >
                            Moeda Única
                          </button>
                        )}
                      </div>
                      <div className="text-base font-black text-zinc-900 tracking-tight">
                        {val} Kz
                      </div>
                      <div className="text-[11px] font-bold text-amber-700 mb-2">
                        = Kz {subtotal.toLocaleString()}
                      </div>
                    </div>

                    {/* Controls: Stepper */}
                    <div>
                      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl p-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => updateCount('coins', valKey, -1)}
                          disabled={count <= 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95 transition-all"
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={count === 0 ? '' : count}
                          onChange={e => setCountDirect('coins', valKey, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-12 text-center font-black text-zinc-900 text-sm outline-none bg-transparent"
                        />

                        <button
                          type="button"
                          onClick={() => updateCount('coins', valKey, 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-700 hover:bg-amber-50 active:scale-95 transition-all font-bold"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Quick addition buttons */}
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => updateCount('coins', valKey, 1)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCount('coins', valKey, 5)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCount('coins', valKey, 10)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 font-medium">
            <span>Notas: <strong>Kz {notesTotal.toLocaleString()}</strong></span>
            <span className="mx-2">•</span>
            <span>Moedas: <strong>Kz {coinsTotal.toLocaleString()}</strong></span>
            <span className="mx-2">•</span>
            <span>Total: <strong className={isExact ? 'text-emerald-700 font-black' : 'text-zinc-800'}>Kz {currentTotal.toLocaleString()}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-bold text-zinc-600 hover:bg-zinc-200 transition-all text-sm"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={(!isExact && targetOpeningAmount > 0) || isSubmitting}
              className={`px-7 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-lg ${
                isExact || targetOpeningAmount === 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-200'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Abrir Caixa
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

/**
 * Modal para o vendedor inspecionar a qualquer momento as notas e moedas disponíveis no caixa ativo.
 */
/**
 * Modal para o vendedor ou gerente inspecionar detalhadamente as notas e moedas disponíveis no caixa ativo,
 * além do controle de entradas e saídas de cada cédula/moeda ao longo da sessão.
 */
interface CashDrawerInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: DenominationBreakdown | null | undefined;
  initialBreakdown?: DenominationBreakdown | null | undefined;
  history?: DenominationHistoryEntry[] | null | undefined;
  expectedBalance?: number;
  registerName: string;
  sessionOpeningTime?: string;
  sellerName?: string;
  sessionTotals?: {
    sales?: number;
    sales_cash?: number;
    in?: number;
    out?: number;
    expected?: number;
  };
}

export const CashDrawerInventoryModal: React.FC<CashDrawerInventoryModalProps> = ({
  isOpen,
  onClose,
  breakdown,
  initialBreakdown,
  history = [],
  expectedBalance,
  registerName,
  sessionOpeningTime,
  sellerName,
  sessionTotals
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'summary' | 'history'>('inventory');

  if (!isOpen) return null;

  const physicalTotal = calculateDenominationsTotal(breakdown);
  const effectiveExpected = expectedBalance !== undefined 
    ? expectedBalance 
    : (sessionTotals?.expected !== undefined ? sessionTotals.expected : physicalTotal);
  
  const diff = physicalTotal - effectiveExpected;
  const isSynchronized = Math.abs(diff) < 0.01;

  // Resumo de entradas e saídas por denominação
  const summaryRows = computeSummaryByDenomination(initialBreakdown, history, breakdown);

  const totalUnitsNotes = NOTE_VALUES.reduce((sum, val) => sum + Number((breakdown?.notes as any)?.[String(val)] || 0), 0);
  const totalUnitsCoins = COIN_VALUES.reduce((sum, val) => sum + Number((breakdown?.coins as any)?.[String(val)] || 0), 0);

  const totalValueNotes = NOTE_VALUES.reduce((sum, val) => sum + (Number((breakdown?.notes as any)?.[String(val)] || 0) * val), 0);
  const totalValueCoins = COIN_VALUES.reduce((sum, val) => sum + (Number((breakdown?.coins as any)?.[String(val)] || 0) * val), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              <Coins size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-900">Cédulas e Moedas no Caixa</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase">
                  Caixa Aberto
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Caixa: <strong className="text-zinc-700">{registerName}</strong>
                {sellerName && <span className="ml-2">• Operador: <strong className="text-zinc-700">{sellerName}</strong></span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              title="Imprimir relatório físico do caixa"
              className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* HERO CARD - BALANÇO & SINCRONIZAÇÃO */}
        <div className="p-5 pb-0 shrink-0">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-850 to-zinc-900 text-white shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Saldo Físico em Cédulas e Moedas
                </span>
                <span className="text-3xl font-black text-emerald-400 tracking-tight">
                  Kz {physicalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-zinc-700/80 sm:pl-5">
                <div>
                  <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Saldo Esperado
                  </span>
                  <span className="text-lg font-black text-white">
                    Kz {effectiveExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="ml-auto sm:ml-2">
                  {isSynchronized ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span>100% Sincronizado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                      <AlertTriangle size={15} className="text-rose-400" />
                      <span>Diferença: Kz {diff.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick breakdown badges */}
            <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Banknote size={14} className="text-emerald-400" />
                  <span>Notas: <strong>{totalUnitsNotes} un</strong> (Kz {totalValueNotes.toLocaleString()})</span>
                </span>
                <span className="flex items-center gap-1">
                  <Coins size={14} className="text-amber-400" />
                  <span>Moedas: <strong>{totalUnitsCoins} un</strong> (Kz {totalValueCoins.toLocaleString()})</span>
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                {sessionOpeningTime ? `Aberto em ${new Date(sessionOpeningTime).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}` : 'Sessão em curso'}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-5 pt-4 pb-1 shrink-0">
          <div className="flex p-1 bg-zinc-100 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                activeTab === 'inventory' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              <Layers size={14} />
              <span>Estoque Atual ({totalUnitsNotes + totalUnitsCoins} un)</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                activeTab === 'summary' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              <Scale size={14} />
              <span>Entradas vs Saídas de Moedas</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                activeTab === 'history' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              <History size={14} />
              <span>Histórico de Movimentos</span>
              {history.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-zinc-200 rounded-full">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: ESTOQUE ATUAL */}
          {activeTab === 'inventory' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* CÉDULAS / NOTAS */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">
                      Cédulas / Notas Oficiais (5)
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    Subtotal: Kz {totalValueNotes.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {NOTE_VALUES.map(val => {
                    const count = Number((breakdown?.notes as any)?.[String(val)] || 0);
                    const subtotal = count * val;
                    return (
                      <div 
                        key={`inv-note-${val}`} 
                        className={cn(
                          "p-3 rounded-2xl border transition-all text-center relative overflow-hidden",
                          count > 0 
                            ? "bg-emerald-50/40 border-emerald-200/70 shadow-xs" 
                            : "bg-zinc-50/80 border-zinc-200 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Nota</span>
                          <span className="text-[10px] font-bold text-zinc-400">AO</span>
                        </div>
                        <span className="text-sm font-black text-zinc-900 block">{val.toLocaleString()} Kz</span>
                        <div className="my-1.5 py-1 px-2 rounded-xl bg-white border border-emerald-100 inline-block shadow-xs">
                          <span className="text-base font-black text-emerald-700">{count}</span>
                          <span className="text-[10px] font-bold text-emerald-900 ml-1">un</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 block">
                          = Kz {subtotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOEDAS METÁLICAS */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">
                      Moedas Metálicas Oficiais (5)
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-amber-700">
                    Subtotal: Kz {totalValueCoins.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {COIN_VALUES.map(val => {
                    const count = Number((breakdown?.coins as any)?.[String(val)] || 0);
                    const subtotal = count * val;
                    return (
                      <div 
                        key={`inv-coin-${val}`} 
                        className={cn(
                          "p-3 rounded-2xl border transition-all text-center relative overflow-hidden",
                          count > 0 
                            ? "bg-amber-50/50 border-amber-200/80 shadow-xs" 
                            : "bg-zinc-50/80 border-zinc-200 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Moeda</span>
                          <span className="text-[10px] font-bold text-zinc-400">AO</span>
                        </div>
                        <span className="text-sm font-black text-zinc-900 block">{val} Kz</span>
                        <div className="my-1.5 py-1 px-2 rounded-xl bg-white border border-amber-100 inline-block shadow-xs">
                          <span className="text-base font-black text-amber-700">{count}</span>
                          <span className="text-[10px] font-bold text-amber-900 ml-1">un</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 block">
                          = Kz {subtotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENTRADAS VS SAÍDAS (QUADRO COMPARATIVO) */}
          {activeTab === 'summary' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Balanço de Circulação no PDV:</strong> Este quadro contabiliza exatamente cada cédula e moeda que entrou no caixa (em pagamentos de vendas a dinheiro e entradas de suprimento) e cada moeda/cédula que saiu (em devolução de trocos e sangrias).
                </p>
              </div>

              <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100/80 border-b border-zinc-200 text-zinc-600 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Denominação</th>
                      <th className="py-3 px-3 text-center">Abertura</th>
                      <th className="py-3 px-3 text-center text-emerald-700">Entraram (+)</th>
                      <th className="py-3 px-3 text-center text-rose-700">Saíram (-)</th>
                      <th className="py-3 px-3 text-center font-black">Em Caixa (=)</th>
                      <th className="py-3 px-4 text-right font-black">Subtotal (Kz)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {summaryRows.map((row) => (
                      <tr key={`summary-row-${row.type}-${row.value}`} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-bold flex items-center gap-2 text-zinc-900">
                          {row.type === 'note' ? (
                            <Banknote size={14} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Coins size={14} className="text-amber-500 shrink-0" />
                          )}
                          <span>{row.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-zinc-500">
                          {row.initialCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30">
                          {row.enteredCount > 0 ? `+${row.enteredCount}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600 bg-rose-50/30">
                          {row.exitedCount > 0 ? `-${row.exitedCount}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-zinc-900">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-xs",
                            row.currentCount > 0 ? "bg-zinc-100 text-zinc-900 font-black" : "text-zinc-300"
                          )}>
                            {row.currentCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-zinc-800">
                          Kz {row.currentTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50 border-t border-zinc-200 font-black text-xs text-zinc-900">
                      <td className="py-3 px-4 uppercase text-[11px]">Total Geral em Caixa</td>
                      <td className="py-3 px-3 text-center text-zinc-500">
                        {summaryRows.reduce((sum, r) => sum + r.initialCount, 0)} un
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-700">
                        +{summaryRows.reduce((sum, r) => sum + r.enteredCount, 0)} un
                      </td>
                      <td className="py-3 px-3 text-center text-rose-700">
                        -{summaryRows.reduce((sum, r) => sum + r.exitedCount, 0)} un
                      </td>
                      <td className="py-3 px-3 text-center font-black text-emerald-700">
                        {summaryRows.reduce((sum, r) => sum + r.currentCount, 0)} un
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                        Kz {physicalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: HISTÓRICO DE MOVIMENTOS DA SESSÃO */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {(!history || history.length === 0) ? (
                <div className="text-center py-12 px-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <History size={32} className="mx-auto text-zinc-300 mb-2" />
                  <p className="text-sm font-bold text-zinc-600">Nenhuma movimentação detalhada nesta sessão ainda.</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    As vendas com dinheiro físico, trocos e movimentos serão registados aqui em tempo real.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((entry, idx) => {
                    const isOpening = entry.type === 'open';
                    const isSale = entry.type === 'sale';
                    const isMoveIn = entry.type === 'movement_in';
                    const isMoveOut = entry.type === 'movement_out';

                    return (
                      <div 
                        key={`history-entry-${entry.id || idx}`}
                        className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs space-y-2 hover:bg-zinc-100/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase",
                              isOpening && "bg-blue-100 text-blue-800",
                              isSale && "bg-emerald-100 text-emerald-800",
                              isMoveIn && "bg-amber-100 text-amber-800",
                              isMoveOut && "bg-rose-100 text-rose-800"
                            )}>
                              {isOpening ? 'Abertura' : isSale ? 'Venda PDV' : isMoveIn ? 'Entrada' : 'Sangria'}
                            </span>
                            <span className="font-black text-zinc-900">{entry.title}</span>
                          </div>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {new Date(entry.timestamp).toLocaleTimeString('pt-AO')}
                          </span>
                        </div>

                        {/* DETALHES DE ENTRADA E SAÍDA DESTE EVENTO */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* MOEDAS QUE ENTRARAM */}
                          {entry.in && (
                            <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                              <div className="flex items-center gap-1 text-emerald-800 font-bold text-[10px] uppercase">
                                <ArrowDownRight size={12} />
                                <span>Entrou no Caixa (+):</span>
                              </div>
                              <div className="text-[11px] text-emerald-900 font-medium">
                                {[
                                  ...Object.entries(entry.in.notes || {}).filter(([_, c]) => Number(c) > 0).map(([val, c]) => `${c}x Nota ${Number(val).toLocaleString()} Kz`),
                                  ...Object.entries(entry.in.coins || {}).filter(([_, c]) => Number(c) > 0).map(([val, c]) => `${c}x Moeda ${val} Kz`),
                                ].join(' + ') || 'Nenhuma'}
                              </div>
                              {entry.cash_received && (
                                <span className="text-[10px] text-emerald-700 font-bold block">
                                  Valor recebido: Kz {entry.cash_received.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}

                          {/* MOEDAS QUE SAÍRAM DE TROCO */}
                          {(entry.out || (entry.out_combination && entry.out_combination.length > 0)) && (
                            <div className="p-2 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
                              <div className="flex items-center gap-1 text-rose-800 font-bold text-[10px] uppercase">
                                <ArrowUpRight size={12} />
                                <span>Saiu como Troco / Saída (-):</span>
                              </div>
                              <div className="text-[11px] text-rose-900 font-medium">
                                {entry.out_combination 
                                  ? entry.out_combination.map(c => `${c.count}x ${c.type === 'note' ? 'Nota' : 'Moeda'} ${c.value.toLocaleString()} Kz`).join(' + ')
                                  : [
                                      ...Object.entries(entry.out?.notes || {}).filter(([_, c]) => Number(c) > 0).map(([val, c]) => `${c}x Nota ${Number(val).toLocaleString()} Kz`),
                                      ...Object.entries(entry.out?.coins || {}).filter(([_, c]) => Number(c) > 0).map(([val, c]) => `${c}x Moeda ${val} Kz`),
                                    ].join(' + ') || 'Nenhum'
                                }
                              </div>
                              {entry.change_given !== undefined && (
                                <span className="text-[10px] text-rose-700 font-bold block">
                                  Troco devolvido: Kz {entry.change_given.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SALDO APÓS A OPERAÇÃO */}
                        {entry.current && (
                          <div className="flex justify-between items-center pt-1 border-t border-zinc-200/60 text-[11px] text-zinc-500">
                            <span>Saldo no Caixa após a operação:</span>
                            <span className="font-black text-zinc-800">
                              Kz {calculateDenominationsTotal(entry.current).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-500">
            Total em Caixa: <strong className="text-zinc-900">Kz {physicalTotal.toLocaleString()}</strong>
            <span className="mx-2">•</span>
            Saldo Esperado: <strong className="text-zinc-900">Kz {effectiveExpected.toLocaleString()}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all active:scale-95 shadow-sm"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
