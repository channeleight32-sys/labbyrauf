import { PresetNodeDef, PresetWireDef } from "../data/logicSpecs";

export interface BooleanToken {
  type: "VAR" | "CONST" | "NOT_PRE" | "NOT_POST" | "AND" | "OR" | "XOR" | "XNOR" | "NAND" | "NOR" | "LPAREN" | "RPAREN";
  value: string;
}

export interface AlgebraicStep {
  ruleName: string;
  lawFormula: string;
  expressionBefore: string;
  expressionAfter: string;
  explanation: string;
}

export interface PrimeImplicantInfo {
  mask: string;
  minterms: number[];
  termSOP: string;
  termPOS: string;
  essential: boolean;
  selectedInMinimalCover?: boolean;
  literalCount?: number;
}

export interface QuineMcCluskeyPassItem {
  mask: string;
  minterms: number[];
  onesCount: number;
  combined: boolean;
  termSOP: string;
}

export interface QuineMcCluskeyPass {
  passIndex: number;
  title: string;
  description: string;
  groups: {
    onesCount: number;
    items: QuineMcCluskeyPassItem[];
  }[];
}

export interface QuineMcCluskeyDetails {
  passes: QuineMcCluskeyPass[];
  allPrimeImplicants: PrimeImplicantInfo[];
  essentialPrimeImplicants: PrimeImplicantInfo[];
  selectedPrimeImplicants: PrimeImplicantInfo[];
  uniqueMintermColumns: number[];
  inputLiteralCount: number;
  minimalSopLiteralCount: number;
  literalReductionPercent: number;
}

export type SynthesisArchitecture =
  | "SOP_AND_OR"
  | "POS_OR_AND"
  | "NAND_ONLY"
  | "NOR_ONLY"
  | "DECODER_74138";

export interface BooleanAnalysisResult {
  valid: boolean;
  error?: string;
  rawInput: string;
  normalizedExpression: string;
  variables: string[];
  numVars: number;
  truthTable: {
    index: number;
    bits: number[];
    output: 0 | 1;
    mintermTerm: string;
    maxtermTerm: string;
  }[];
  minterms: number[];
  maxterms: number[];
  canonicalSOP: string;
  canonicalPOS: string;
  minimizedSOP: string;
  minimizedPOS: string;
  nandOnlyExpression: string;
  norOnlyExpression: string;
  reedMullerANF: string;
  primeImplicants: PrimeImplicantInfo[];
  quineMcCluskey: QuineMcCluskeyDetails;
  algebraicSteps: AlgebraicStep[];
  gateCost: {
    sopGates: number;
    sopLiterals: number;
    nandOnlyGates: number;
    norOnlyGates: number;
  };
}

export const BOOLEAN_PRESET_FUNCTIONS: {
  name: string;
  category: string;
  expression: string;
  description: string;
}[] = [
  {
    name: "Majority Voter (3-Var)",
    category: "Combinational",
    expression: "A*B + B*C + A*C",
    description: "Outputs 1 when at least two of A, B, C are 1 (Full Adder Carry).",
  },
  {
    name: "Full Adder Sum (3-Var)",
    category: "Arithmetic",
    expression: "A ^ B ^ C",
    description: "3-input odd parity / Full Adder Sum function.",
  },
  {
    name: "2-to-1 Multiplexer",
    category: "Data Routing",
    expression: "S'*A + S*B",
    description: "Selects input A when S=0 and input B when S=1.",
  },
  {
    name: "Consensus Theorem Demo",
    category: "Algebraic Law",
    expression: "A*B + A'*C + B*C",
    description: "Demonstrates Elimination of Redundant Consensus Term B·C → A·B + A'·C.",
  },
  {
    name: "De Morgan Cascade",
    category: "Algebraic Law",
    expression: "(A' + B')' + A*B*C",
    description: "Reduces via De Morgan & Absorption: (A'+B')' + ABC = AB + ABC = AB.",
  },
  {
    name: "4-Bit Prime Detector",
    category: "4-Variable",
    expression: "A'*B'*C + A'*C*D + B'*C*D + A*B'*D",
    description: "Detects prime numbers (1,2,3,5,7,11,13) in 4-bit binary (A,B,C,D).",
  },
  {
    name: "BCD Invalid Code Detector",
    category: "4-Variable",
    expression: "A*B + A*C",
    description: "Outputs 1 for binary values 10..15 (invalid 8421 BCD codes).",
  },
  {
    name: "Equality Comparator (2-Bit)",
    category: "Arithmetic",
    expression: "(A ~^ C) * (B ~^ D)",
    description: "Outputs 1 when 2-bit word AB equals 2-bit word CD.",
  },
];

export const BOOLEAN_ALGEBRA_LAWS_REFERENCE: {
  category: string;
  name: string;
  andForm: string;
  orForm: string;
  description: string;
}[] = [
  {
    category: "Fundamental",
    name: "Identity Law",
    andForm: "A · 1 = A",
    orForm: "A + 0 = A",
    description: "ANDing with 1 or ORing with 0 preserves the variable.",
  },
  {
    category: "Fundamental",
    name: "Null / Dominance Law",
    andForm: "A · 0 = 0",
    orForm: "A + 1 = 1",
    description: "ANDing with 0 forces 0; ORing with 1 forces 1.",
  },
  {
    category: "Fundamental",
    name: "Idempotent Law",
    andForm: "A · A = A",
    orForm: "A + A = A",
    description: "Duplicate literals in a product or sum are redundant.",
  },
  {
    category: "Fundamental",
    name: "Inverse / Complement Law",
    andForm: "A · A' = 0",
    orForm: "A + A' = 1",
    description: "A variable combined with its complement yields a constant.",
  },
  {
    category: "Fundamental",
    name: "Involution (Double Negation)",
    andForm: "(A')' = A",
    orForm: "(A')' = A",
    description: "Inverting a signal twice restores the original signal.",
  },
  {
    category: "Combinational",
    name: "Commutative Law",
    andForm: "A · B = B · A",
    orForm: "A + B = B + A",
    description: "Input pin ordering does not alter symmetric gate output.",
  },
  {
    category: "Combinational",
    name: "Associative Law",
    andForm: "(A · B) · C = A · (B · C)",
    orForm: "(A + B) + C = A + (B + C)",
    description: "Multi-input cascades can be grouped in any order.",
  },
  {
    category: "Combinational",
    name: "Distributive Law",
    andForm: "A · (B + C) = A·B + A·C",
    orForm: "A + (B · C) = (A + B) · (A + C)",
    description: "Factors common literals or expands POS to SOP.",
  },
  {
    category: "Simplification",
    name: "Absorption Law",
    andForm: "A · (A + B) = A",
    orForm: "A + (A · B) = A",
    description: "Eliminates larger terms already covered by a single literal.",
  },
  {
    category: "Simplification",
    name: "Complement Absorption",
    andForm: "A · (A' + B) = A · B",
    orForm: "A + (A' · B) = A + B",
    description: "Cancels a complemented literal inside an adjacent term.",
  },
  {
    category: "Simplification",
    name: "Logical Adjacency (Combining)",
    andForm: "(A + B) · (A + B') = A",
    orForm: "A·B + A·B' = A",
    description: "Basis of Karnaugh Map and Quine-McCluskey cell merging.",
  },
  {
    category: "Simplification",
    name: "Consensus Theorem",
    andForm: "(A+B)·(A'+C)·(B+C) = (A+B)·(A'+C)",
    orForm: "A·B + A'·C + B·C = A·B + A'·C",
    description: "Eliminates redundant consensus term B·C (or adds it to prevent static hazards).",
  },
  {
    category: "Universal Gates",
    name: "De Morgan's Theorem",
    andForm: "(A · B)' = A' + B'",
    orForm: "(A + B)' = A' · B'",
    description: "Converts NAND to negative-OR and NOR to negative-AND.",
  },
];

/**
 * Tokenize a human-written Boolean algebra expression.
 * Supports:
 *  - Variables: A..E (case-insensitive, normalized to uppercase A..E)
 *  - Constants: 0, 1
 *  - Postfix complement: A', (A+B)', A̅
 *  - Prefix complement: !A, ~A, NOT A
 *  - AND: *, ·, &, &&, AND, or implicit adjacency (e.g. AB, A(B+C), (A+B)(C+D), A'B)
 *  - OR: +, |, ||, OR
 *  - XOR: ^, ⊕, XOR
 *  - XNOR: ~^, ^~, ⊙, XNOR
 *  - NAND / NOR: NAND, NOR
 */
export function tokenizeBooleanExpression(raw: string): {
  tokens: BooleanToken[];
  error?: string;
} {
  // Strip leading "Y =" or "F(A,B,C) =" if user typed an equation
  const cleaned = raw
    .replace(/^[A-Za-z0-9_]+\s*(\([A-Za-z,\s]+\))?\s*=\s*/, "")
    .trim();

  if (!cleaned) {
    return { tokens: [], error: "Enter a Boolean expression (e.g., A'B + BC)." };
  }

  const rawTokens: BooleanToken[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Multi-character operators
    const restUpper = cleaned.slice(i).toUpperCase();
    if (restUpper.startsWith("XNOR")) {
      rawTokens.push({ type: "XNOR", value: "XNOR" });
      i += 4;
      continue;
    }
    if (restUpper.startsWith("NAND")) {
      rawTokens.push({ type: "NAND", value: "NAND" });
      i += 4;
      continue;
    }
    if (restUpper.startsWith("XOR")) {
      rawTokens.push({ type: "XOR", value: "XOR" });
      i += 3;
      continue;
    }
    if (restUpper.startsWith("NOR")) {
      rawTokens.push({ type: "NOR", value: "NOR" });
      i += 3;
      continue;
    }
    if (restUpper.startsWith("AND") && !/[A-Z0-9_]/i.test(cleaned[i + 3] || "")) {
      rawTokens.push({ type: "AND", value: "AND" });
      i += 3;
      continue;
    }
    if (restUpper.startsWith("OR") && !/[A-Z0-9_]/i.test(cleaned[i + 2] || "")) {
      rawTokens.push({ type: "OR", value: "OR" });
      i += 2;
      continue;
    }
    if (restUpper.startsWith("NOT") && !/[A-Z0-9_]/i.test(cleaned[i + 3] || "")) {
      rawTokens.push({ type: "NOT_PRE", value: "NOT" });
      i += 3;
      continue;
    }
    if (cleaned.slice(i, i + 2) === "~^" || cleaned.slice(i, i + 2) === "^~") {
      rawTokens.push({ type: "XNOR", value: "⊙" });
      i += 2;
      continue;
    }
    if (cleaned.slice(i, i + 2) === "&&") {
      rawTokens.push({ type: "AND", value: "·" });
      i += 2;
      continue;
    }
    if (cleaned.slice(i, i + 2) === "||") {
      rawTokens.push({ type: "OR", value: "+" });
      i += 2;
      continue;
    }

    // Single-character operators
    if (ch === "(" || ch === "[") {
      rawTokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (ch === ")" || ch === "]") {
      rawTokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (ch === "'" || ch === "’" || ch === "`" || ch === "\u0304" || ch === "\u0305") {
      rawTokens.push({ type: "NOT_POST", value: "'" });
      i++;
      continue;
    }
    if (ch === "!" || ch === "~" || ch === "¬") {
      rawTokens.push({ type: "NOT_PRE", value: "!" });
      i++;
      continue;
    }
    if (ch === "*" || ch === "·" || ch === "•" || ch === "&" || ch === "∧") {
      rawTokens.push({ type: "AND", value: "·" });
      i++;
      continue;
    }
    if (ch === "+" || ch === "|" || ch === "∨") {
      rawTokens.push({ type: "OR", value: "+" });
      i++;
      continue;
    }
    if (ch === "^" || ch === "⊕") {
      rawTokens.push({ type: "XOR", value: "⊕" });
      i++;
      continue;
    }
    if (ch === "⊙" || ch === "≡") {
      rawTokens.push({ type: "XNOR", value: "⊙" });
      i++;
      continue;
    }
    if (ch === "0" || ch === "1") {
      rawTokens.push({ type: "CONST", value: ch });
      i++;
      continue;
    }

    // Variable A..Z
    if (/[A-Za-z]/.test(ch)) {
      const upper = ch.toUpperCase();
      if (!["A", "B", "C", "D", "E", "W", "X", "Y", "Z", "S"].includes(upper)) {
        return {
          tokens: [],
          error: `Unsupported variable '${ch}'. Use standard logic variables A, B, C, D, E (or W, X, Y, Z, S).`,
        };
      }
      rawTokens.push({ type: "VAR", value: upper });
      i++;
      continue;
    }

    return {
      tokens: [],
      error: `Unexpected character '${ch}' at position ${i + 1}.`,
    };
  }

  // Insert implicit AND tokens where appropriate:
  // Left is VAR, CONST, RPAREN, NOT_POST
  // Right is VAR, CONST, LPAREN, NOT_PRE
  const withImplicitAnd: BooleanToken[] = [];
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const curr = rawTokens[idx];
    withImplicitAnd.push(curr);
    if (idx + 1 < rawTokens.length) {
      const next = rawTokens[idx + 1];
      const leftCanEndTerm =
        curr.type === "VAR" ||
        curr.type === "CONST" ||
        curr.type === "RPAREN" ||
        curr.type === "NOT_POST";
      const rightCanStartTerm =
        next.type === "VAR" ||
        next.type === "CONST" ||
        next.type === "LPAREN" ||
        next.type === "NOT_PRE";
      if (leftCanEndTerm && rightCanStartTerm) {
        withImplicitAnd.push({ type: "AND", value: "·" });
      }
    }
  }

  return { tokens: withImplicitAnd };
}

/**
 * Convert infix tokens to Reverse Polish Notation (RPN) using Shunting-Yard
 */
function toRPN(tokens: BooleanToken[]): { rpn: BooleanToken[]; error?: string } {
  const output: BooleanToken[] = [];
  const opStack: BooleanToken[] = [];

  const precedence: Record<string, number> = {
    NOT_POST: 6,
    NOT_PRE: 5,
    AND: 4,
    NAND: 4,
    XOR: 3,
    XNOR: 3,
    OR: 2,
    NOR: 2,
  };

  const isRightAssociative = (t: BooleanToken) => t.type === "NOT_PRE";

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type === "VAR" || tok.type === "CONST") {
      output.push(tok);
    } else if (tok.type === "NOT_POST") {
      output.push(tok);
    } else if (tok.type === "NOT_PRE") {
      opStack.push(tok);
    } else if (tok.type === "LPAREN") {
      opStack.push(tok);
    } else if (tok.type === "RPAREN") {
      let foundLeft = false;
      while (opStack.length > 0) {
        const top = opStack.pop()!;
        if (top.type === "LPAREN") {
          foundLeft = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeft) {
        return { rpn: [], error: "Mismatched closing parenthesis ')'." };
      }
    } else {
      // Binary operator
      const pCurr = precedence[tok.type] ?? 1;
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top.type === "LPAREN") break;
        const pTop = precedence[top.type] ?? 1;
        if (pTop > pCurr || (pTop === pCurr && !isRightAssociative(tok))) {
          output.push(opStack.pop()!);
        } else {
          break;
        }
      }
      opStack.push(tok);
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top.type === "LPAREN" || top.type === "RPAREN") {
      return { rpn: [], error: "Unclosed parenthesis '(' in expression." };
    }
    output.push(top);
  }

  return { rpn: output };
}

function evalRPN(
  rpn: BooleanToken[],
  env: Record<string, number>
): { value: 0 | 1; error?: string } {
  const stack: number[] = [];
  for (const tok of rpn) {
    if (tok.type === "CONST") {
      stack.push(tok.value === "1" ? 1 : 0);
    } else if (tok.type === "VAR") {
      stack.push(env[tok.value] ?? 0);
    } else if (tok.type === "NOT_POST" || tok.type === "NOT_PRE") {
      if (stack.length < 1) {
        return { value: 0, error: "Missing operand for NOT complement operator." };
      }
      const a = stack.pop()!;
      stack.push(a ^ 1);
    } else {
      if (stack.length < 2) {
        return {
          value: 0,
          error: `Missing operand for binary operator '${tok.value}'.`,
        };
      }
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (tok.type) {
        case "AND":
          stack.push(a & b);
          break;
        case "NAND":
          stack.push((a & b) ^ 1);
          break;
        case "OR":
          stack.push(a | b);
          break;
        case "NOR":
          stack.push((a | b) ^ 1);
          break;
        case "XOR":
          stack.push(a ^ b);
          break;
        case "XNOR":
          stack.push((a ^ b) ^ 1);
          break;
        default:
          stack.push(0);
      }
    }
  }

  if (stack.length !== 1) {
    return { value: 0, error: "Invalid Boolean syntax — check operators and operands." };
  }
  return { value: stack[0] ? 1 : 0 };
}

function maskToSOP(mask: string, vars: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < vars.length; i++) {
    if (mask[i] === "1") parts.push(vars[i]);
    else if (mask[i] === "0") parts.push(`${vars[i]}'`);
  }
  return parts.length > 0 ? parts.join("") : "1";
}

function maskToPOS(mask: string, vars: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < vars.length; i++) {
    if (mask[i] === "0") parts.push(vars[i]);
    else if (mask[i] === "1") parts.push(`${vars[i]}'`);
  }
  return parts.length > 0 ? `(${parts.join(" + ")})` : "0";
}

function countMaskOnes(mask: string): number {
  let c = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === "1") c++;
  }
  return c;
}

function countMaskLiterals(mask: string): number {
  let c = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === "1" || mask[i] === "0") c++;
  }
  return c;
}

export function solveQuineMcCluskeyDetailed(
  targetMinterms: number[],
  dontCares: number[],
  vars: string[],
  inputLiteralCount = 0
): QuineMcCluskeyDetails {
  const numVars = vars.length;
  if (targetMinterms.length === 0) {
    return {
      passes: [],
      allPrimeImplicants: [],
      essentialPrimeImplicants: [],
      selectedPrimeImplicants: [],
      uniqueMintermColumns: [],
      inputLiteralCount,
      minimalSopLiteralCount: 0,
      literalReductionPercent: inputLiteralCount > 0 ? 100 : 0,
    };
  }

  const allTerms = Array.from(new Set([...targetMinterms, ...dontCares])).sort(
    (a, b) => a - b
  );
  const totalCells = 1 << numVars;

  interface TermItem {
    mask: string;
    minterms: number[];
    used: boolean;
  }

  let currentGroup: TermItem[] = allTerms.map((m) => ({
    mask: m.toString(2).padStart(numVars, "0"),
    minterms: [m],
    used: false,
  }));

  const passes: QuineMcCluskeyPass[] = [];
  const primeImplicants: TermItem[] = [];
  let passIndex = 0;

  while (currentGroup.length > 0) {
    const nextMap = new Map<string, number[]>();
    const n = currentGroup.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = currentGroup[i];
        const b = currentGroup[j];
        let diffIdx = -1;
        let diffCount = 0;
        for (let k = 0; k < numVars; k++) {
          if (a.mask[k] !== b.mask[k]) {
            if (a.mask[k] === "-" || b.mask[k] === "-") {
              diffCount = 99;
              break;
            }
            diffCount++;
            diffIdx = k;
          }
        }
        if (diffCount === 1 && diffIdx !== -1) {
          a.used = true;
          b.used = true;
          const mergedMask =
            a.mask.slice(0, diffIdx) + "-" + a.mask.slice(diffIdx + 1);
          const mergedMinterms = Array.from(
            new Set([...a.minterms, ...b.minterms])
          ).sort((x, y) => x - y);
          nextMap.set(mergedMask, mergedMinterms);
        }
      }
    }

    // Record this tabular pass grouped by Hamming weight (count of '1's)
    const buckets = new Map<number, QuineMcCluskeyPassItem[]>();
    for (const item of currentGroup) {
      const ones = countMaskOnes(item.mask);
      if (!buckets.has(ones)) buckets.set(ones, []);
      buckets.get(ones)!.push({
        mask: item.mask,
        minterms: item.minterms,
        onesCount: ones,
        combined: item.used,
        termSOP: maskToSOP(item.mask, vars),
      });

      if (!item.used) {
        if (!primeImplicants.some((p) => p.mask === item.mask)) {
          primeImplicants.push(item);
        }
      }
    }

    const sortedGroups = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([onesCount, items]) => ({ onesCount, items }));

    passes.push({
      passIndex,
      title:
        passIndex === 0
          ? "Column I — Hamming Weight Minterm Groups"
          : `Column ${passIndex + 1} — ${1 << passIndex}-Cell Implicant Merges (${passIndex} Eliminated Var${passIndex > 1 ? "s" : ""})`,
      description:
        passIndex === 0
          ? "Group canonical minterms by number of 1s in binary mask and compare adjacent groups for 1-bit differences."
          : `Combine adjacent implicants with identical '-' positions differing in 1 bit using X·Y + X·Y' = X.`,
      groups: sortedGroups,
    });

    passIndex++;
    currentGroup = Array.from(nextMap.entries()).map(([mask, minterms]) => ({
      mask,
      minterms,
      used: false,
    }));
  }

  if (allTerms.length === totalCells) {
    const tautPI: PrimeImplicantInfo = {
      mask: "-".repeat(numVars),
      minterms: targetMinterms,
      termSOP: "1",
      termPOS: "(1)",
      essential: true,
      selectedInMinimalCover: true,
      literalCount: 0,
    };
    return {
      passes,
      allPrimeImplicants: [tautPI],
      essentialPrimeImplicants: [tautPI],
      selectedPrimeImplicants: [tautPI],
      uniqueMintermColumns: [...targetMinterms],
      inputLiteralCount,
      minimalSopLiteralCount: 0,
      literalReductionPercent: inputLiteralCount > 0 ? 100 : 0,
    };
  }

  // Stage 2: Prime Implicant Coverage Chart & Petrick / Minimal-Literal Selection
  const uncovered = new Set<number>(targetMinterms);
  const selectedPIs: PrimeImplicantInfo[] = [];
  const usedMasks = new Set<string>();
  const essentialMasks = new Set<string>();
  const uniqueMintermColumns: number[] = [];

  for (const m of targetMinterms) {
    const covering = primeImplicants.filter((pi) => pi.minterms.includes(m));
    if (covering.length === 1) {
      uniqueMintermColumns.push(m);
      const epi = covering[0];
      essentialMasks.add(epi.mask);
      if (!usedMasks.has(epi.mask)) {
        usedMasks.add(epi.mask);
        selectedPIs.push({
          mask: epi.mask,
          minterms: epi.minterms.filter((x) => targetMinterms.includes(x)),
          termSOP: maskToSOP(epi.mask, vars),
          termPOS: maskToPOS(epi.mask, vars),
          essential: true,
          selectedInMinimalCover: true,
          literalCount: countMaskLiterals(epi.mask),
        });
        epi.minterms.forEach((x) => uncovered.delete(x));
      }
    }
  }

  // Petrick / Exact Minimal-Literal Cover for remaining uncovered minterms
  const remainingCandidates = primeImplicants.filter(
    (pi) =>
      !usedMasks.has(pi.mask) && pi.minterms.some((m) => uncovered.has(m))
  );

  if (uncovered.size > 0 && remainingCandidates.length > 0) {
    const uncoveredArr = Array.from(uncovered);
    if (remainingCandidates.length <= 16) {
      // Exact branch-and-bound / Petrick search over candidate subsets
      let bestSubset: TermItem[] | null = null;
      let bestTermCount = Infinity;
      let bestLiteralSum = Infinity;

      const totalSubsets = 1 << remainingCandidates.length;
      for (let mask = 1; mask < totalSubsets; mask++) {
        let termCount = 0;
        let literalSum = 0;
        for (let b = 0; b < remainingCandidates.length; b++) {
          if ((mask >> b) & 1) {
            termCount++;
            literalSum += countMaskLiterals(remainingCandidates[b].mask);
          }
        }
        if (
          termCount > bestTermCount ||
          (termCount === bestTermCount && literalSum >= bestLiteralSum)
        ) {
          continue;
        }
        // Check if all uncovered minterms are covered
        let coversAll = true;
        for (const um of uncoveredArr) {
          let covered = false;
          for (let b = 0; b < remainingCandidates.length; b++) {
            if ((mask >> b) & 1 && remainingCandidates[b].minterms.includes(um)) {
              covered = true;
              break;
            }
          }
          if (!covered) {
            coversAll = false;
            break;
          }
        }
        if (coversAll) {
          bestTermCount = termCount;
          bestLiteralSum = literalSum;
          bestSubset = [];
          for (let b = 0; b < remainingCandidates.length; b++) {
            if ((mask >> b) & 1) bestSubset.push(remainingCandidates[b]);
          }
        }
      }

      if (bestSubset) {
        for (const pi of bestSubset) {
          usedMasks.add(pi.mask);
          selectedPIs.push({
            mask: pi.mask,
            minterms: pi.minterms.filter((x) => targetMinterms.includes(x)),
            termSOP: maskToSOP(pi.mask, vars),
            termPOS: maskToPOS(pi.mask, vars),
            essential: false,
            selectedInMinimalCover: true,
            literalCount: countMaskLiterals(pi.mask),
          });
          pi.minterms.forEach((x) => uncovered.delete(x));
        }
      }
    } else {
      // Fallback greedy cover with literal-cost tie-breaking
      while (uncovered.size > 0) {
        let bestPI: TermItem | null = null;
        let bestCount = -1;
        let bestLiterals = Infinity;

        for (const pi of primeImplicants) {
          if (usedMasks.has(pi.mask)) continue;
          const count = pi.minterms.filter((m) => uncovered.has(m)).length;
          const lits = countMaskLiterals(pi.mask);
          if (
            count > bestCount ||
            (count === bestCount && count > 0 && lits < bestLiterals)
          ) {
            bestCount = count;
            bestLiterals = lits;
            bestPI = pi;
          }
        }

        if (!bestPI || bestCount <= 0) break;
        usedMasks.add(bestPI.mask);
        selectedPIs.push({
          mask: bestPI.mask,
          minterms: bestPI.minterms.filter((x) => targetMinterms.includes(x)),
          termSOP: maskToSOP(bestPI.mask, vars),
          termPOS: maskToPOS(bestPI.mask, vars),
          essential: false,
          selectedInMinimalCover: true,
          literalCount: countMaskLiterals(bestPI.mask),
        });
        bestPI.minterms.forEach((x) => uncovered.delete(x));
      }
    }
  }

  const allPrimeImplicants: PrimeImplicantInfo[] = primeImplicants.map((pi) => ({
    mask: pi.mask,
    minterms: pi.minterms.filter((x) => targetMinterms.includes(x)),
    termSOP: maskToSOP(pi.mask, vars),
    termPOS: maskToPOS(pi.mask, vars),
    essential: essentialMasks.has(pi.mask),
    selectedInMinimalCover: usedMasks.has(pi.mask),
    literalCount: countMaskLiterals(pi.mask),
  }));

  const minimalSopLiteralCount = selectedPIs.reduce(
    (acc, pi) => acc + (pi.literalCount ?? countMaskLiterals(pi.mask)),
    0
  );

  const literalReductionPercent =
    inputLiteralCount > minimalSopLiteralCount && inputLiteralCount > 0
      ? Math.round(
          ((inputLiteralCount - minimalSopLiteralCount) / inputLiteralCount) * 100
        )
      : 0;

  return {
    passes,
    allPrimeImplicants,
    essentialPrimeImplicants: allPrimeImplicants.filter((p) => p.essential),
    selectedPrimeImplicants: selectedPIs,
    uniqueMintermColumns,
    inputLiteralCount,
    minimalSopLiteralCount,
    literalReductionPercent,
  };
}

export function solveQuineMcCluskeyVars(
  targetMinterms: number[],
  dontCares: number[],
  vars: string[]
): PrimeImplicantInfo[] {
  return solveQuineMcCluskeyDetailed(targetMinterms, dontCares, vars)
    .selectedPrimeImplicants;
}

/**
 * Compute Algebraic Normal Form (Reed-Muller / Positive Polarity XOR polynomial)
 * via Fast Mobius Transform on the truth table vector
 */
function computeReedMullerANF(truthBits: number[], vars: string[]): string {
  const n = vars.length;
  const N = 1 << n;
  const coeffs = [...truthBits];

  for (let i = 0; i < n; i++) {
    const step = 1 << i;
    for (let mask = 0; mask < N; mask++) {
      if (mask & step) {
        coeffs[mask] ^= coeffs[mask ^ step];
      }
    }
  }

  const terms: string[] = [];
  for (let mask = 0; mask < N; mask++) {
    if (coeffs[mask] === 1) {
      if (mask === 0) {
        terms.push("1");
      } else {
        let term = "";
        for (let b = 0; b < n; b++) {
          if ((mask >> (n - 1 - b)) & 1) {
            term += vars[b];
          }
        }
        terms.push(term);
      }
    }
  }

  return terms.length > 0 ? terms.join(" ⊕ ") : "0";
}

/**
 * Build step-by-step algebraic simplification walkthrough from Canonical SOM to Minimized SOP
 */
function buildAlgebraicDerivationSteps(
  rawInput: string,
  canonicalSOP: string,
  minimizedSOP: string,
  primeImplicants: PrimeImplicantInfo[],
  vars: string[],
  minterms: number[]
): AlgebraicStep[] {
  const steps: AlgebraicStep[] = [];

  if (minterms.length === 0) {
    steps.push({
      ruleName: "Null / Contradiction Evaluation",
      lawFormula: "A · A' = 0",
      expressionBefore: rawInput,
      expressionAfter: "0",
      explanation: "All truth table rows evaluate to 0; function simplifies to constant 0.",
    });
    return steps;
  }

  if (minterms.length === 1 << vars.length) {
    steps.push({
      ruleName: "Tautology / Exhaustive Sum",
      lawFormula: "A + A' = 1",
      expressionBefore: canonicalSOP,
      expressionAfter: "1",
      explanation: "All minterms are present; complementary pairs collapse to constant 1.",
    });
    return steps;
  }

  // Step 1: Canonical Sum of Minterms expansion
  steps.push({
    ruleName: "1. Canonical Minterm Expansion (Shannon Expansion)",
    lawFormula: "F = ∑ m_i",
    expressionBefore: rawInput,
    expressionAfter: canonicalSOP,
    explanation: `Expand input function across ${vars.join(", ")} into ${minterms.length} canonical minterm product(s): ∑m(${minterms.join(", ")}).`,
  });

  // Step 2: Logical Adjacency / Combining Law for merged implicants
  const mergedPIs = primeImplicants.filter((pi) => pi.mask.includes("-"));
  if (mergedPIs.length > 0) {
    const intermediateTerms = primeImplicants.map((pi) => {
      const eliminatedVars = vars.filter((_, idx) => pi.mask[idx] === "-");
      return eliminatedVars.length > 0
        ? `${pi.termSOP} [eliminates ${eliminatedVars.join(",")}]`
        : pi.termSOP;
    });

    steps.push({
      ruleName: "2. Logical Adjacency & Distributive Factoring",
      lawFormula: "X·Y + X·Y' = X·(Y + Y') = X·1 = X",
      expressionBefore: canonicalSOP,
      expressionAfter: intermediateTerms.join(" + "),
      explanation: `Factor adjacent minterms differing in a single complemented literal and apply Complement Law (Y + Y' = 1).`,
    });
  }

  // Step 3: Consensus / Essential Prime Implicant Cover
  const nonEssentialCount = primeImplicants.filter((p) => !p.essential).length;
  steps.push({
    ruleName:
      nonEssentialCount > 0
        ? "3. Absorption & Consensus Redundancy Elimination"
        : "3. Essential Prime Implicant Minimal Cover",
    lawFormula: "X + X·Y = X   ;   A·B + A'·C + B·C = A·B + A'·C",
    expressionBefore: primeImplicants
      .map((pi) => `m(${pi.minterms.join(",")}) → ${pi.termSOP}`)
      .join("  +  "),
    expressionAfter: minimizedSOP,
    explanation: `Retain minimal cover of ${primeImplicants.length} prime implicant(s) covering all ${minterms.length} minterms with minimum literal count.`,
  });

  // Step 4: Universal De Morgan NAND-NAND transformation
  if (primeImplicants.length > 1) {
    const nandForm = `(${primeImplicants
      .map((pi) => `(${pi.termSOP})'`)
      .join(" · ")})'`;
    steps.push({
      ruleName: "4. De Morgan's Law (Universal NAND-NAND Synthesis)",
      lawFormula: "T1 + T2 = ((T1)' · (T2)')'",
      expressionBefore: minimizedSOP,
      expressionAfter: nandForm,
      explanation:
        "Apply Double Negation and De Morgan's Theorem to convert 2-level AND-OR SOP into a pure 7400 NAND-only network.",
    });
  }

  return steps;
}

/**
 * Analyze any Boolean expression (or minterm specification) and return full truth table,
 * canonical SOM/POM, minimized SOP/POS, NAND/NOR universal forms, Reed-Muller ANF, and algebraic steps.
 */
export function analyzeBooleanExpression(
  rawExpression: string,
  forcedVars?: string[]
): BooleanAnalysisResult {
  const emptyQM: QuineMcCluskeyDetails = {
    passes: [],
    allPrimeImplicants: [],
    essentialPrimeImplicants: [],
    selectedPrimeImplicants: [],
    uniqueMintermColumns: [],
    inputLiteralCount: 0,
    minimalSopLiteralCount: 0,
    literalReductionPercent: 0,
  };

  const { tokens, error: tokErr } = tokenizeBooleanExpression(rawExpression);
  if (tokErr) {
    return {
      valid: false,
      error: tokErr,
      rawInput: rawExpression,
      normalizedExpression: "",
      variables: ["A", "B", "C"],
      numVars: 3,
      truthTable: [],
      minterms: [],
      maxterms: [],
      canonicalSOP: "0",
      canonicalPOS: "1",
      minimizedSOP: "0",
      minimizedPOS: "1",
      nandOnlyExpression: "0",
      norOnlyExpression: "0",
      reedMullerANF: "0",
      primeImplicants: [],
      quineMcCluskey: emptyQM,
      algebraicSteps: [],
      gateCost: { sopGates: 0, sopLiterals: 0, nandOnlyGates: 0, norOnlyGates: 0 },
    };
  }

  const { rpn, error: rpnErr } = toRPN(tokens);
  if (rpnErr) {
    return {
      valid: false,
      error: rpnErr,
      rawInput: rawExpression,
      normalizedExpression: "",
      variables: ["A", "B", "C"],
      numVars: 3,
      truthTable: [],
      minterms: [],
      maxterms: [],
      canonicalSOP: "0",
      canonicalPOS: "1",
      minimizedSOP: "0",
      minimizedPOS: "1",
      nandOnlyExpression: "0",
      norOnlyExpression: "0",
      reedMullerANF: "0",
      primeImplicants: [],
      quineMcCluskey: emptyQM,
      algebraicSteps: [],
      gateCost: { sopGates: 0, sopLiterals: 0, nandOnlyGates: 0, norOnlyGates: 0 },
    };
  }

  const rawInputLiteralCount = tokens.filter((t) => t.type === "VAR").length;

  // Determine active variables
  const detectedVars = Array.from(
    new Set(tokens.filter((t) => t.type === "VAR").map((t) => t.value))
  ).sort();

  let variables = forcedVars && forcedVars.length >= 2 ? [...forcedVars] : detectedVars;
  for (const dv of detectedVars) {
    if (!variables.includes(dv)) variables.push(dv);
  }
  if (variables.length < 2) {
    const defaults = ["A", "B", "C"];
    for (const d of defaults) {
      if (variables.length >= 2) break;
      if (!variables.includes(d)) variables.push(d);
    }
  }
  variables = variables.slice(0, 5);
  const numVars = variables.length;
  const totalRows = 1 << numVars;

  const truthTable: BooleanAnalysisResult["truthTable"] = [];
  const minterms: number[] = [];
  const maxterms: number[] = [];
  const truthBits: number[] = [];

  for (let idx = 0; idx < totalRows; idx++) {
    const bits: number[] = [];
    const env: Record<string, number> = {};
    for (let b = 0; b < numVars; b++) {
      const bit = ((idx >> (numVars - 1 - b)) & 1) as 0 | 1;
      bits.push(bit);
      env[variables[b]] = bit;
    }

    const res = evalRPN(rpn, env);
    if (res.error) {
      return {
        valid: false,
        error: res.error,
        rawInput: rawExpression,
        normalizedExpression: "",
        variables,
        numVars,
        truthTable: [],
        minterms: [],
        maxterms: [],
        canonicalSOP: "0",
        canonicalPOS: "1",
        minimizedSOP: "0",
        minimizedPOS: "1",
        nandOnlyExpression: "0",
        norOnlyExpression: "0",
        reedMullerANF: "0",
        primeImplicants: [],
        quineMcCluskey: emptyQM,
        algebraicSteps: [],
        gateCost: { sopGates: 0, sopLiterals: 0, nandOnlyGates: 0, norOnlyGates: 0 },
      };
    }

    const mintermTerm = variables
      .map((v, i) => (bits[i] === 1 ? v : `${v}'`))
      .join("·");
    const maxtermTerm = `(${variables
      .map((v, i) => (bits[i] === 0 ? v : `${v}'`))
      .join(" + ")})`;

    truthTable.push({
      index: idx,
      bits,
      output: res.value,
      mintermTerm,
      maxtermTerm,
    });
    truthBits.push(res.value);

    if (res.value === 1) minterms.push(idx);
    else maxterms.push(idx);
  }

  const canonicalSOP =
    minterms.length === 0
      ? "0"
      : minterms.map((m) => truthTable[m].mintermTerm).join(" + ");

  const canonicalPOS =
    maxterms.length === 0
      ? "1"
      : maxterms.map((m) => truthTable[m].maxtermTerm).join(" · ");

  const quineMcCluskey = solveQuineMcCluskeyDetailed(
    minterms,
    [],
    variables,
    rawInputLiteralCount
  );
  const sopImplicants = quineMcCluskey.selectedPrimeImplicants;
  const posZeroImplicants = solveQuineMcCluskeyVars(maxterms, [], variables);

  const minimizedSOP =
    minterms.length === 0
      ? "0"
      : minterms.length === totalRows
      ? "1"
      : sopImplicants.map((i) => i.termSOP).join(" + ");

  const minimizedPOS =
    maxterms.length === 0
      ? "1"
      : maxterms.length === totalRows
      ? "0"
      : posZeroImplicants.map((i) => i.termPOS).join(" · ");

  const nandOnlyExpression =
    minterms.length === 0
      ? "0"
      : minterms.length === totalRows
      ? "1"
      : sopImplicants.length === 1
      ? `((${sopImplicants[0].termSOP})')'`
      : `(${sopImplicants.map((i) => `(${i.termSOP})'`).join(" · ")})'`;

  const norOnlyExpression =
    maxterms.length === 0
      ? "1"
      : maxterms.length === totalRows
      ? "0"
      : posZeroImplicants.length === 1
      ? `((${posZeroImplicants[0].termPOS})')'`
      : `(${posZeroImplicants.map((i) => `${i.termPOS}'`).join(" + ")})'`;

  const reedMullerANF = computeReedMullerANF(truthBits, variables);

  const normalizedExpression = tokens.map((t) => t.value).join(" ");
  const algebraicSteps = buildAlgebraicDerivationSteps(
    rawExpression,
    canonicalSOP,
    minimizedSOP,
    sopImplicants,
    variables,
    minterms
  );

  let sopLiterals = 0;
  let invNeeded = new Set<number>();
  for (const imp of sopImplicants) {
    for (let i = 0; i < numVars; i++) {
      if (imp.mask[i] === "1" || imp.mask[i] === "0") sopLiterals++;
      if (imp.mask[i] === "0") invNeeded.add(i);
    }
  }
  const productGateCount = sopImplicants.filter(
    (imp) => imp.mask.split("").filter((c) => c !== "-").length >= 2
  ).length;
  const sumGateCount = sopImplicants.length > 1 ? sopImplicants.length - 1 : 0;
  const sopGates = invNeeded.size + productGateCount + sumGateCount;

  return {
    valid: true,
    rawInput: rawExpression,
    normalizedExpression,
    variables,
    numVars,
    truthTable,
    minterms,
    maxterms,
    canonicalSOP,
    canonicalPOS,
    minimizedSOP,
    minimizedPOS,
    nandOnlyExpression,
    norOnlyExpression,
    reedMullerANF,
    primeImplicants: sopImplicants,
    quineMcCluskey,
    algebraicSteps,
    gateCost: {
      sopGates,
      sopLiterals,
      nandOnlyGates: invNeeded.size + sopImplicants.length + 1,
      norOnlyGates: invNeeded.size + posZeroImplicants.length + 1,
    },
  };
}

/**
 * Synthesize a BooleanAnalysisResult into an interactive CircuitLab schematic
 * using the user's chosen hardware architecture:
 * - SOP_AND_OR: 2-level AND-OR with input NOT gates
 * - POS_OR_AND: 2-level OR-AND with input NOT gates
 * - NAND_ONLY: Universal 7400 2-level NAND-NAND network
 * - NOR_ONLY: Universal 7402 2-level NOR-NOR network
 * - DECODER_74138: 74138 3-to-8 Decoder + OR minterm combiner (for 3 variables)
 */
export function synthesizeBooleanFunctionToCircuit(
  analysis: BooleanAnalysisResult,
  architecture: SynthesisArchitecture,
  outputLabel = "F"
): {
  title: string;
  nodes: PresetNodeDef[];
  wires: PresetWireDef[];
} {
  const vars = analysis.variables.slice(0, 4);
  const numVars = vars.length;
  const nodes: PresetNodeDef[] = [];
  const wires: PresetWireDef[] = [];

  // 1. Place INPUT switches in column X = 60
  for (let i = 0; i < numVars; i++) {
    nodes.push({
      type: "INPUT",
      x: 60,
      y: 80 + i * 100,
      value: 0,
      label: vars[i],
    });
  }

  // Handle constant 0 or 1
  if (
    analysis.minterms.length === 0 ||
    analysis.minterms.length === 1 << analysis.numVars
  ) {
    nodes.push({
      type: "OUTPUT",
      x: 340,
      y: 160,
      label: `${outputLabel}=${analysis.minimizedSOP}`,
    });
    wires.push([0, 0, nodes.length - 1, 0]);
    return {
      title: `Boolean Function: ${outputLabel} = ${analysis.minimizedSOP}`,
      nodes,
      wires,
    };
  }

  // Special architecture: 74138 3-to-8 Decoder Minterm Generator
  if (architecture === "DECODER_74138" && numVars <= 3) {
    // Pad to 3 inputs if 2 vars
    while (nodes.length < 3) {
      nodes.push({
        type: "INPUT",
        x: 60,
        y: 80 + nodes.length * 100,
        value: 0,
        label: "0",
      });
    }
    const decIdx = nodes.length;
    nodes.push({
      type: "74138",
      x: 240,
      y: 120,
      label: "74138_DEC",
    });
    // 74138 inputs: A(lsb)=pin 0, B=pin 1, C(msb)=pin 2, G1=pin 3(1), G2A=pin 4(0), G2B=pin 5(0)
    // Map MSB vars[0] -> C (pin 2), vars[1] -> B (pin 1), vars[2] -> A (pin 0)
    if (numVars === 3) {
      wires.push([0, 0, decIdx, 2]);
      wires.push([1, 0, decIdx, 1]);
      wires.push([2, 0, decIdx, 0]);
    } else {
      wires.push([0, 0, decIdx, 1]);
      wires.push([1, 0, decIdx, 0]);
    }

    // 74138 outputs active-low Y0'..Y7'; NANDing active-low minterms yields the OR of minterms!
    const activeMinterms = analysis.minterms.filter((m) => m < 8);
    let currentDriverNodes: { node: number; port: number }[] = activeMinterms.map(
      (m) => ({
        node: decIdx,
        port: m,
      })
    );

    if (currentDriverNodes.length === 1) {
      const notIdx = nodes.length;
      nodes.push({ type: "NOT", x: 460, y: 180 });
      wires.push([
        currentDriverNodes[0].node,
        currentDriverNodes[0].port,
        notIdx,
        0,
      ]);
      const outIdx = nodes.length;
      nodes.push({ type: "OUTPUT", x: 640, y: 180, label: outputLabel });
      wires.push([notIdx, 0, outIdx, 0]);
    } else {
      // Invert active-low decoder outputs and OR-cascade them
      const invTermNodes: number[] = [];
      currentDriverNodes.forEach((drv, idx) => {
        const invIdx = nodes.length;
        nodes.push({
          type: "NOT",
          x: 420,
          y: 60 + idx * 70,
        });
        wires.push([drv.node, drv.port, invIdx, 0]);
        invTermNodes.push(invIdx);
      });

      let accumIdx = invTermNodes[0];
      for (let k = 1; k < invTermNodes.length; k++) {
        const orIdx = nodes.length;
        nodes.push({
          type: "OR",
          x: 560 + (k - 1) * 110,
          y: 100 + k * 55,
        });
        wires.push([accumIdx, 0, orIdx, 0]);
        wires.push([invTermNodes[k], 0, orIdx, 1]);
        accumIdx = orIdx;
      }

      const outIdx = nodes.length;
      nodes.push({
        type: "OUTPUT",
        x: 600 + invTermNodes.length * 100,
        y: 160,
        label: outputLabel,
      });
      wires.push([accumIdx, 0, outIdx, 0]);
    }

    return {
      title: `74138 Decoder Generator: ${outputLabel} = ∑m(${activeMinterms.join(",")})`,
      nodes,
      wires,
    };
  }

  // Determine implicants and gate types based on architecture
  const isPOS =
    architecture === "POS_OR_AND" || architecture === "NOR_ONLY";
  const implicants = isPOS
    ? solveQuineMcCluskeyVars(analysis.maxterms, [], vars)
    : analysis.primeImplicants;

  const firstStageGate =
    architecture === "NAND_ONLY"
      ? "NAND"
      : architecture === "NOR_ONLY"
      ? "NOR"
      : isPOS
      ? "OR"
      : "AND";

  const secondStageGate =
    architecture === "NAND_ONLY"
      ? "NAND"
      : architecture === "NOR_ONLY"
      ? "NOR"
      : isPOS
      ? "AND"
      : "OR";

  // Check which variables need complement inverters
  // For SOP / NAND: mask[v] === '0' needs inverted literal
  // For POS / NOR: mask[v] === '1' in maxterm cover needs inverted literal
  const needComplementBit = isPOS ? "1" : "0";
  const directBit = isPOS ? "0" : "1";

  const invNodeByVar: Record<number, number> = {};
  for (let v = 0; v < numVars; v++) {
    if (implicants.some((imp) => imp.mask[v] === needComplementBit)) {
      const invIdx = nodes.length;
      nodes.push({
        type: "NOT",
        x: 180,
        y: 80 + v * 100,
      });
      wires.push([v, 0, invIdx, 0]);
      invNodeByVar[v] = invIdx;
    }
  }

  // Build Stage 1 term outputs
  const termOutIndices: number[] = [];
  let termY = 80;

  for (const imp of implicants) {
    const litSources: number[] = [];
    for (let v = 0; v < numVars; v++) {
      if (imp.mask[v] === directBit) litSources.push(v);
      else if (imp.mask[v] === needComplementBit)
        litSources.push(invNodeByVar[v]);
    }

    if (litSources.length === 1) {
      if (architecture === "NAND_ONLY" || architecture === "NOR_ONLY") {
        // In 2-level NAND-NAND or NOR-NOR, single literals feeding stage 2 must be inverted
        const gIdx = nodes.length;
        nodes.push({
          type: architecture === "NAND_ONLY" ? "NAND" : "NOR",
          x: 340,
          y: termY,
        });
        wires.push([litSources[0], 0, gIdx, 0]);
        wires.push([litSources[0], 0, gIdx, 1]);
        termOutIndices.push(gIdx);
        termY += 90;
      } else {
        termOutIndices.push(litSources[0]);
      }
    } else if (litSources.length >= 2) {
      // Cascade 2-input gates
      let prevIdx = litSources[0];
      for (let k = 1; k < litSources.length; k++) {
        const isLastInTerm = k === litSources.length - 1;
        // For multi-literal NAND/NOR terms, intermediate cascade uses AND/OR, final stage uses NAND/NOR
        const gateType = isLastInTerm
          ? firstStageGate
          : isPOS
          ? "OR"
          : "AND";
        const gIdx = nodes.length;
        nodes.push({
          type: gateType,
          x: 340 + (k - 1) * 120,
          y: termY,
        });
        wires.push([prevIdx, 0, gIdx, 0]);
        wires.push([litSources[k], 0, gIdx, 1]);
        prevIdx = gIdx;
      }
      termOutIndices.push(prevIdx);
      termY += 95;
    }
  }

  // Combine Stage 1 terms into Stage 2
  let finalNodeIdx = termOutIndices[0] ?? 0;
  let finalX = 560;

  if (termOutIndices.length >= 2) {
    let prevTerm = termOutIndices[0];
    for (let t = 1; t < termOutIndices.length; t++) {
      const isFinalCombine = t === termOutIndices.length - 1;
      // If chaining >2 terms in NAND/NOR mode, convert intermediate NAND/NOR back before next stage
      const gIdx = nodes.length;
      const gx = 560 + (t - 1) * 140;
      const gy = 110 + (t - 1) * 80;
      nodes.push({
        type: secondStageGate,
        x: gx,
        y: gy,
      });
      wires.push([prevTerm, 0, gIdx, 0]);
      wires.push([termOutIndices[t], 0, gIdx, 1]);
      prevTerm = gIdx;
      finalX = gx + 150;

      if (
        !isFinalCombine &&
        (architecture === "NAND_ONLY" || architecture === "NOR_ONLY")
      ) {
        const reInvIdx = nodes.length;
        nodes.push({
          type: architecture === "NAND_ONLY" ? "NAND" : "NOR",
          x: gx + 110,
          y: gy,
        });
        wires.push([prevTerm, 0, reInvIdx, 0]);
        wires.push([prevTerm, 0, reInvIdx, 1]);
        prevTerm = reInvIdx;
        finalX = gx + 240;
      }
    }
    finalNodeIdx = prevTerm;
  }

  const outNodeIdx = nodes.length;
  nodes.push({
    type: "OUTPUT",
    x: finalX,
    y: 160,
    label: outputLabel,
  });
  wires.push([finalNodeIdx, 0, outNodeIdx, 0]);

  const archNames: Record<SynthesisArchitecture, string> = {
    SOP_AND_OR: "SOP (AND-OR)",
    POS_OR_AND: "POS (OR-AND)",
    NAND_ONLY: "Universal NAND-Only",
    NOR_ONLY: "Universal NOR-Only",
    DECODER_74138: "74138 Decoder",
  };

  return {
    title: `${archNames[architecture]}: ${outputLabel} = ${
      isPOS ? analysis.minimizedPOS : analysis.minimizedSOP
    }`,
    nodes,
    wires,
  };
}
