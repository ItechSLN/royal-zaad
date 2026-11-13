import { Transform } from 'class-transformer';

/**
 * Trims and lowercases an email before validation, so `Foo@x.com ` and
 * `foo@x.com` are the same account everywhere it is stored or looked up.
 */
export const NormalizeEmail = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
