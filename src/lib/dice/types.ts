export type DndRollResult = {
  expression: string;
  total: number;
  dice: number[];
  dieCount: number;
  dieSize: number | null;
  modifier: number;
  details: string;
};

export type ParsedDndExpression =
  | {
      kind: "dice";
      dieCount: number;
      dieSize: number;
      modifier: number;
    }
  | {
      kind: "flat";
      modifier: number;
    };

export type NwodAgain = 8 | 9 | 10 | null;

export type NwodRollOptions = {
  pool: number;
  again?: NwodAgain;
  rote?: boolean;
  chanceDie?: boolean;
};

export type NwodRollResult = {
  expression: string;
  successes: number;
  rolls: number[];
  explodedRolls: number[];
  roteRerolls: number[];
  dramaticFailure: boolean;
  details: string;
};

export type RandomSource = () => number;
