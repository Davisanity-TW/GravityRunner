import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type ContractValidationError = {
  path: string;
  message: string;
};

export type ContractValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: ContractValidationError[] };

export function validateContract(
  schema: TSchema,
  value: unknown
): ContractValidationResult {
  if (Value.Check(schema, value)) {
    return { valid: true, errors: [] };
  }

  const errors = [...Value.Errors(schema, value)].map((error) => ({
    path: error.path,
    message: error.message
  }));

  return { valid: false, errors };
}
