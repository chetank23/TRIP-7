import { BudgetSource } from '@/types';

const MAX_BUDGET_CENTS = 999_999_999_999; // NUMERIC(12, 2)
const MAX_SOURCES = 30;

export function calculateBudgetTotal(sources: BudgetSource[]): number {
  return sources.reduce((sum, source) => sum + Math.round(source.unitAmount * 100) * source.quantity, 0) / 100;
}

export function validateBudgetSources(input: unknown):
  | { sources: BudgetSource[]; total: number }
  | { error: string } {
  if (!Array.isArray(input) || input.length === 0) return { error: 'Add at least one budget source before saving.' };
  if (input.length > MAX_SOURCES) return { error: `You can add up to ${MAX_SOURCES} budget sources.` };

  const ids = new Set<string>();
  const sources: BudgetSource[] = [];
  let totalCents = 0;

  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: `Budget source ${index + 1} is invalid.` };
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const unitAmount = Number(item.unitAmount);
    const quantity = Number(item.quantity);
    if (!id || id.length > 100 || ids.has(id)) return { error: `Budget source ${index + 1} has an invalid or duplicate ID. Please retry.` };
    if (!name || name.length > 80) return { error: `Enter a source name (up to 80 characters) for source ${index + 1}.` };
    if (!Number.isFinite(unitAmount) || unitAmount <= 0 || unitAmount > 9_999_999_999.99) return { error: `Enter a valid amount greater than ₹0 for “${name}”.` };
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999_999) return { error: `Enter a whole-number quantity of at least 1 for “${name}”.` };
    const amountCents = Math.round(unitAmount * 100);
    if (Math.abs(amountCents - unitAmount * 100) > 0.0001 || amountCents <= 0) return { error: `Use up to two decimal places for the amount in “${name}”.` };
    totalCents += amountCents * quantity;
    if (!Number.isSafeInteger(totalCents) || totalCents > MAX_BUDGET_CENTS) return { error: 'The total trip budget is too large. Please reduce the source amounts.' };
    ids.add(id);
    sources.push({ id, name, unitAmount: amountCents / 100, quantity });
  }
  return { sources, total: totalCents / 100 };
}
