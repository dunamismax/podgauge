import { z } from 'zod';

export const MAX_DECK_TEXT_BYTES = 256 * 1024;
export const MAX_DECK_ENTRIES = 500;
export const MAX_CARD_FACES = 8;

export const SemanticVersionSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u,
    'Expected a semantic version',
  );

export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const IsoDateSchema = z.iso.date();
export const Sha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/u, 'Expected a lowercase SHA-256 digest')
  .brand<'Sha256'>();

export const ColorSchema = z.enum(['W', 'U', 'B', 'R', 'G']);
export const ColorIdentitySchema = z
  .array(ColorSchema)
  .max(5)
  .superRefine((colors, context) => {
    if (new Set(colors).size !== colors.length) {
      context.addIssue({
        code: 'custom',
        message: 'Color identity cannot contain duplicates',
      });
    }
    const canonicalOrder = ['W', 'U', 'B', 'R', 'G'];
    const sorted = [...colors].sort(
      (left, right) =>
        canonicalOrder.indexOf(left) - canonicalOrder.indexOf(right),
    );
    if (sorted.some((color, index) => color !== colors[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Color identity must use WUBRG order',
      });
    }
  })
  .readonly();

export const BoundedDisplayNameSchema = z.string().trim().min(1).max(256);
export const BoundedSourceTextSchema = z.string().min(1).max(2_048);
export const BoundedDeckTextSchema = z
  .string()
  .min(1)
  .max(MAX_DECK_TEXT_BYTES)
  .superRefine((value, context) => {
    if (new TextEncoder().encode(value).byteLength > MAX_DECK_TEXT_BYTES) {
      context.addIssue({
        code: 'custom',
        message: `Deck text cannot exceed ${MAX_DECK_TEXT_BYTES} UTF-8 bytes`,
      });
    }
  });

export function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function addDuplicateIssue(
  values: readonly string[],
  context: z.RefinementCtx,
  label: string,
): void {
  if (!hasUniqueValues(values)) {
    context.addIssue({
      code: 'custom',
      message: `${label} must be unique`,
    });
  }
}

export type Sha256 = z.infer<typeof Sha256Schema>;
