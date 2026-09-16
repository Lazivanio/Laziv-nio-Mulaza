/**
 * cashDenominations.ts
 * Gestão e cálculo de denominações de notas e moedas em circulação em Angola (Kz - Kwanza).
 * 
 * Cédulas / Notas oficiais (5):
 * - 5.000 Kz
 * - 2.000 Kz
 * - 1.000 Kz
 * - 500 Kz
 * - 200 Kz
 * 
 * Moedas metálicas oficiais (5):
 * - 200 Kz
 * - 100 Kz
 * - 50 Kz
 * - 20 Kz
 * - 10 Kz
 */

export interface DenominationBreakdown {
  notes: {
    '200': number;
    '500': number;
    '1000': number;
    '2000': number;
    '5000': number;
  };
  coins: {
    '10': number;
    '20': number;
    '50': number;
    '100': number;
    '200': number;
  };
}

export const NOTE_VALUES = [200, 500, 1000, 2000, 5000] as const;
export const COIN_VALUES = [10, 20, 50, 100, 200] as const;

export const EMPTY_DENOMINATIONS: DenominationBreakdown = {
  notes: {
    '200': 0,
    '500': 0,
    '1000': 0,
    '2000': 0,
    '5000': 0,
  },
  coins: {
    '10': 0,
    '20': 0,
    '50': 0,
    '100': 0,
    '200': 0,
  },
};

/**
 * Calcula o somatório total monetário (em Kwanzas) a partir das quantidades de notas e moedas.
 */
export function calculateDenominationsTotal(breakdown: DenominationBreakdown | null | undefined): number {
  if (!breakdown) return 0;
  let total = 0;

  if (breakdown.notes) {
    for (const [val, count] of Object.entries(breakdown.notes)) {
      total += Number(val) * (Number(count) || 0);
    }
  }

  if (breakdown.coins) {
    for (const [val, count] of Object.entries(breakdown.coins)) {
      total += Number(val) * (Number(count) || 0);
    }
  }

  return total;
}

export interface ChangeItemCombination {
  value: number;
  count: number;
  type: 'note' | 'coin';
  label: string;
}

export interface ChangeFeasibilityResult {
  possible: boolean;
  totalAvailable: number;
  reason?: string;
  combination?: ChangeItemCombination[];
}

/**
 * Formata de forma legível a combinação de notas/moedas para entrega do troco.
 */
export function formatChangeCombination(combination?: ChangeItemCombination[]): string {
  if (!combination || combination.length === 0) return 'Sem troco necessário';
  return combination
    .map(c => `${c.count}x ${c.type === 'note' ? 'Nota' : 'Moeda'} ${c.value.toLocaleString()} Kz`)
    .join(', ');
}

/**
 * Algoritmo exato de verificação de troco (Coin Change com restrição de estoque de notas e moedas).
 * 
 * Determina se a quantia de troco pode ser exata e precisamente paga com o que está no caixa.
 */
export function checkChangeFeasibility(
  changeAmount: number,
  breakdown: DenominationBreakdown | null | undefined
): ChangeFeasibilityResult {
  const roundedChange = Math.round(changeAmount * 100) / 100;
  
  if (roundedChange <= 0) {
    return {
      possible: true,
      totalAvailable: calculateDenominationsTotal(breakdown),
      combination: []
    };
  }

  // Se o caixa não tiver registro detalhado de denominações, assumimos total 0 ou indefinido
  if (!breakdown) {
    return {
      possible: false,
      totalAvailable: 0,
      reason: 'Não há registo detalhado de notas e moedas no caixa activo para validar o troco.'
    };
  }

  const totalAvailable = calculateDenominationsTotal(breakdown);

  // 1. O saldo total do caixa em dinheiro é inferior ao troco
  if (roundedChange > totalAvailable) {
    return {
      possible: false,
      totalAvailable,
      reason: `Dinheiro insuficiente no caixa: O valor total em caixa (Kz ${totalAvailable.toLocaleString()}) não chega para pagar o troco necessário (Kz ${roundedChange.toLocaleString()}).`
    };
  }

  // 2. O troco tem fracções não pagáveis pelas moedas em circulação (menor moeda é 10 Kz)
  if (Math.round(roundedChange) % 10 !== 0 || roundedChange !== Math.floor(roundedChange)) {
    return {
      possible: false,
      totalAvailable,
      reason: `O troco de Kz ${roundedChange.toLocaleString()} tem fracções que não podem ser formadas com as moedas em circulação no país (menor moeda é de 10 Kz).`
    };
  }

  // 3. Montar lista de unidades disponíveis ordenadas da maior para a menor (5000 -> 10)
  const items: { value: number; count: number; type: 'note' | 'coin'; label: string }[] = [
    { value: 5000, count: Number(breakdown.notes['5000'] || 0), type: 'note' as const, label: 'Nota 5.000 Kz' },
    { value: 2000, count: Number(breakdown.notes['2000'] || 0), type: 'note' as const, label: 'Nota 2.000 Kz' },
    { value: 1000, count: Number(breakdown.notes['1000'] || 0), type: 'note' as const, label: 'Nota 1.000 Kz' },
    { value: 500, count: Number(breakdown.notes['500'] || 0), type: 'note' as const, label: 'Nota 500 Kz' },
    { value: 200, count: Number(breakdown.notes['200'] || 0), type: 'note' as const, label: 'Nota 200 Kz' },
    { value: 200, count: Number(breakdown.coins['200'] || 0), type: 'coin' as const, label: 'Moeda 200 Kz' },
    { value: 100, count: Number(breakdown.coins['100'] || 0), type: 'coin' as const, label: 'Moeda 100 Kz' },
    { value: 50, count: Number(breakdown.coins['50'] || 0), type: 'coin' as const, label: 'Moeda 50 Kz' },
    { value: 20, count: Number(breakdown.coins['20'] || 0), type: 'coin' as const, label: 'Moeda 20 Kz' },
    { value: 10, count: Number(breakdown.coins['10'] || 0), type: 'coin' as const, label: 'Moeda 10 Kz' },
  ].filter(it => it.count > 0);

  const chosen: ChangeItemCombination[] = [];

  // Busca retroativa / backtracking com heurística gulosa
  function solve(index: number, remaining: number): boolean {
    if (remaining === 0) return true;
    if (index >= items.length || remaining < 0) return false;

    const item = items[index];
    const maxCanTake = Math.min(item.count, Math.floor(remaining / item.value));

    for (let take = maxCanTake; take >= 0; take--) {
      if (take > 0) {
        chosen.push({
          value: item.value,
          count: take,
          type: item.type,
          label: item.label
        });
      }

      if (solve(index + 1, remaining - take * item.value)) {
        return true;
      }

      if (take > 0) {
        chosen.pop();
      }
    }

    return false;
  }

  const isFeasible = solve(0, roundedChange);

  if (isFeasible) {
    return {
      possible: true,
      totalAvailable,
      combination: chosen
    };
  }

  // Se não foi possível, detalhar quais notas/moedas existem para explicar o porquê
  return {
    possible: false,
    totalAvailable,
    reason: `Com as notas e moedas presentes no caixa não é possível formar a quantia exacta de Kz ${roundedChange.toLocaleString()}. Faltam notas ou moedas fracionárias adequadas.`
  };
}

/**
 * Deduz do estoque do caixa as notas e moedas dadas como troco.
 */
export function deductChangeFromBreakdown(
  breakdown: DenominationBreakdown,
  combination: ChangeItemCombination[]
): DenominationBreakdown {
  const updated: DenominationBreakdown = {
    notes: { ...breakdown.notes },
    coins: { ...breakdown.coins },
  };

  for (const item of combination) {
    const valKey = String(item.value);
    if (item.type === 'note') {
      const current = (updated.notes as any)[valKey] || 0;
      (updated.notes as any)[valKey] = Math.max(0, current - item.count);
    } else {
      const current = (updated.coins as any)[valKey] || 0;
      (updated.coins as any)[valKey] = Math.max(0, current - item.count);
    }
  }

  return updated;
}

/**
 * Decompõe um valor monetário num conjunto de notas e moedas de forma gulosa (maior valor primeiro).
 */
export function decomposeAmountToBreakdown(amount: number): DenominationBreakdown {
  const result: DenominationBreakdown = {
    notes: { '200': 0, '500': 0, '1000': 0, '2000': 0, '5000': 0 },
    coins: { '10': 0, '20': 0, '50': 0, '100': 0, '200': 0 }
  };

  let remaining = Math.round(Math.max(0, amount));

  // Notas (5000, 2000, 1000, 500, 200)
  const noteVals = [5000, 2000, 1000, 500, 200] as const;
  for (const val of noteVals) {
    if (remaining >= val) {
      const count = Math.floor(remaining / val);
      (result.notes as any)[String(val)] = count;
      remaining -= count * val;
    }
  }

  // Moedas (200, 100, 50, 20, 10)
  const coinVals = [200, 100, 50, 20, 10] as const;
  for (const val of coinVals) {
    if (remaining >= val) {
      const count = Math.floor(remaining / val);
      (result.coins as any)[String(val)] = count;
      remaining -= count * val;
    }
  }

  return result;
}

/**
 * Soma duas quebras de denominações (adiciona notas e moedas).
 */
export function addBreakdowns(
  base: DenominationBreakdown | null | undefined,
  addition: DenominationBreakdown | null | undefined
): DenominationBreakdown {
  const safeBase: DenominationBreakdown = base || EMPTY_DENOMINATIONS;
  const safeAddition: DenominationBreakdown = addition || EMPTY_DENOMINATIONS;

  return {
    notes: {
      '200': Number(safeBase.notes?.['200'] || 0) + Number(safeAddition.notes?.['200'] || 0),
      '500': Number(safeBase.notes?.['500'] || 0) + Number(safeAddition.notes?.['500'] || 0),
      '1000': Number(safeBase.notes?.['1000'] || 0) + Number(safeAddition.notes?.['1000'] || 0),
      '2000': Number(safeBase.notes?.['2000'] || 0) + Number(safeAddition.notes?.['2000'] || 0),
      '5000': Number(safeBase.notes?.['5000'] || 0) + Number(safeAddition.notes?.['5000'] || 0),
    },
    coins: {
      '10': Number(safeBase.coins?.['10'] || 0) + Number(safeAddition.coins?.['10'] || 0),
      '20': Number(safeBase.coins?.['20'] || 0) + Number(safeAddition.coins?.['20'] || 0),
      '50': Number(safeBase.coins?.['50'] || 0) + Number(safeAddition.coins?.['50'] || 0),
      '100': Number(safeBase.coins?.['100'] || 0) + Number(safeAddition.coins?.['100'] || 0),
      '200': Number(safeBase.coins?.['200'] || 0) + Number(safeAddition.coins?.['200'] || 0),
    }
  };
}

/**
 * Subtrai uma quebra de denominações (ex: sangria ou retirada de dinheiro).
 */
export function subtractBreakdowns(
  base: DenominationBreakdown | null | undefined,
  subtraction: DenominationBreakdown | null | undefined
): { updated: DenominationBreakdown; success: boolean; error?: string } {
  const safeBase: DenominationBreakdown = base || EMPTY_DENOMINATIONS;
  const safeSub: DenominationBreakdown = subtraction || EMPTY_DENOMINATIONS;

  const res: DenominationBreakdown = {
    notes: {
      '200': Number(safeBase.notes?.['200'] || 0) - Number(safeSub.notes?.['200'] || 0),
      '500': Number(safeBase.notes?.['500'] || 0) - Number(safeSub.notes?.['500'] || 0),
      '1000': Number(safeBase.notes?.['1000'] || 0) - Number(safeSub.notes?.['1000'] || 0),
      '2000': Number(safeBase.notes?.['2000'] || 0) - Number(safeSub.notes?.['2000'] || 0),
      '5000': Number(safeBase.notes?.['5000'] || 0) - Number(safeSub.notes?.['5000'] || 0),
    },
    coins: {
      '10': Number(safeBase.coins?.['10'] || 0) - Number(safeSub.coins?.['10'] || 0),
      '20': Number(safeBase.coins?.['20'] || 0) - Number(safeSub.coins?.['20'] || 0),
      '50': Number(safeBase.coins?.['50'] || 0) - Number(safeSub.coins?.['50'] || 0),
      '100': Number(safeBase.coins?.['100'] || 0) - Number(safeSub.coins?.['100'] || 0),
      '200': Number(safeBase.coins?.['200'] || 0) - Number(safeSub.coins?.['200'] || 0),
    }
  };

  for (const [v, c] of Object.entries(res.notes)) {
    if (c < 0) {
      return { updated: safeBase, success: false, error: `Cédulas de ${Number(v).toLocaleString()} Kz insuficientes no caixa.` };
    }
  }
  for (const [v, c] of Object.entries(res.coins)) {
    if (c < 0) {
      return { updated: safeBase, success: false, error: `Moedas de ${Number(v).toLocaleString()} Kz insuficientes no caixa.` };
    }
  }

  return { updated: res, success: true };
}

/**
 * Atualiza o caixa após uma venda a dinheiro físico:
 * 1. Adiciona as cédulas e moedas recebidas do cliente.
 * 2. Deduz as cédulas e moedas devolvidas como troco.
 */
export function applySaleCashTransaction(
  current: DenominationBreakdown | null | undefined,
  received: DenominationBreakdown | number,
  changeCombination: ChangeItemCombination[] = []
): DenominationBreakdown {
  const safeCurrent = current || EMPTY_DENOMINATIONS;
  const receivedBreakdown = typeof received === 'number' 
    ? decomposeAmountToBreakdown(received)
    : received;

  // 1. Adicionar o dinheiro recebido
  const withReceived = addBreakdowns(safeCurrent, receivedBreakdown);

  // 2. Deduzir o troco
  const finalDrawer = deductChangeFromBreakdown(withReceived, changeCombination);

  return finalDrawer;
}

export interface DenominationHistoryEntry {
  id: number | string;
  type: 'open' | 'sale' | 'movement_in' | 'movement_out';
  title: string;
  timestamp: string;
  in?: DenominationBreakdown | null;
  out?: DenominationBreakdown | null;
  out_combination?: ChangeItemCombination[] | null;
  current: DenominationBreakdown;
  sale_amount?: number;
  cash_received?: number;
  change_given?: number;
  amount?: number;
  changeAmount?: number;
  description?: string;
}

/**
 * Calcula a distribuição ideal de troco com base no estoque atual de notas e moedas disponíveis.
 */
export function calculateChangeDistribution(
  breakdown: DenominationBreakdown | null | undefined,
  changeAmount: number
): ChangeItemCombination[] {
  const check = checkChangeFeasibility(changeAmount, breakdown);
  if (check.possible && check.combination && check.combination.length > 0) {
    return check.combination;
  }
  // Se não foi encontrada combinação direta no inventário estrito, faz a decomposição monetária
  const fallbackBreakdown = decomposeAmountToBreakdown(changeAmount);
  const res: ChangeItemCombination[] = [];
  for (const [val, count] of Object.entries(fallbackBreakdown.notes)) {
    if (count > 0) {
      res.push({ value: Number(val), count, type: 'note', label: `Nota ${Number(val).toLocaleString()} Kz` });
    }
  }
  for (const [val, count] of Object.entries(fallbackBreakdown.coins)) {
    if (count > 0) {
      res.push({ value: Number(val), count, type: 'coin', label: `Moeda ${Number(val).toLocaleString()} Kz` });
    }
  }
  return res;
}

/**
 * Converte uma lista de ChangeItemCombination[] para um objeto DenominationBreakdown.
 */
export function combinationToBreakdown(combination?: ChangeItemCombination[] | null): DenominationBreakdown {
  const res: DenominationBreakdown = {
    notes: { '200': 0, '500': 0, '1000': 0, '2000': 0, '5000': 0 },
    coins: { '10': 0, '20': 0, '50': 0, '100': 0, '200': 0 }
  };
  if (!combination) return res;

  for (const item of combination) {
    const valKey = String(item.value);
    if (item.type === 'note') {
      (res.notes as any)[valKey] = ((res.notes as any)[valKey] || 0) + item.count;
    } else {
      (res.coins as any)[valKey] = ((res.coins as any)[valKey] || 0) + item.count;
    }
  }

  return res;
}

export interface DenominationItemSummary {
  type: 'note' | 'coin';
  value: number;
  label: string;
  initialCount: number;
  enteredCount: number;
  exitedCount: number;
  currentCount: number;
  currentTotal: number;
}

/**
 * Calcula o resumo completo de entradas e saídas de cada cédula e moeda da sessão.
 */
export function computeSummaryByDenomination(
  initial: DenominationBreakdown | null | undefined,
  history: DenominationHistoryEntry[] | null | undefined,
  current: DenominationBreakdown | null | undefined
): DenominationItemSummary[] {
  const safeInitial = initial || EMPTY_DENOMINATIONS;
  const safeCurrent = current || EMPTY_DENOMINATIONS;
  const safeHistory = history || [];

  const denominationsList: { type: 'note' | 'coin'; value: number; label: string }[] = [
    { type: 'note', value: 5000, label: 'Nota 5.000 Kz' },
    { type: 'note', value: 2000, label: 'Nota 2.000 Kz' },
    { type: 'note', value: 1000, label: 'Nota 1.000 Kz' },
    { type: 'note', value: 500, label: 'Nota 500 Kz' },
    { type: 'note', value: 200, label: 'Nota 200 Kz' },
    { type: 'coin', value: 200, label: 'Moeda 200 Kz' },
    { type: 'coin', value: 100, label: 'Moeda 100 Kz' },
    { type: 'coin', value: 50, label: 'Moeda 50 Kz' },
    { type: 'coin', value: 20, label: 'Moeda 20 Kz' },
    { type: 'coin', value: 10, label: 'Moeda 10 Kz' },
  ];

  return denominationsList.map(item => {
    const valKey = String(item.value);
    const initialCount = item.type === 'note'
      ? Number((safeInitial.notes as any)?.[valKey] || 0)
      : Number((safeInitial.coins as any)?.[valKey] || 0);

    let enteredCount = 0;
    let exitedCount = 0;

    for (const entry of safeHistory) {
      // Entradas (ex: vendas ou suprimentos)
      if (entry.type !== 'open' && entry.in) {
        if (item.type === 'note') {
          enteredCount += Number((entry.in.notes as any)?.[valKey] || 0);
        } else {
          enteredCount += Number((entry.in.coins as any)?.[valKey] || 0);
        }
      }

      // Saídas (ex: trocos ou sangrias)
      if (entry.out) {
        if (item.type === 'note') {
          exitedCount += Number((entry.out.notes as any)?.[valKey] || 0);
        } else {
          exitedCount += Number((entry.out.coins as any)?.[valKey] || 0);
        }
      } else if (entry.out_combination) {
        for (const comb of entry.out_combination) {
          if (comb.type === item.type && comb.value === item.value) {
            exitedCount += comb.count;
          }
        }
      }
    }

    const currentCount = item.type === 'note'
      ? Number((safeCurrent.notes as any)?.[valKey] || 0)
      : Number((safeCurrent.coins as any)?.[valKey] || 0);

    return {
      type: item.type,
      value: item.value,
      label: item.label,
      initialCount,
      enteredCount,
      exitedCount,
      currentCount,
      currentTotal: currentCount * item.value
    };
  });
}
