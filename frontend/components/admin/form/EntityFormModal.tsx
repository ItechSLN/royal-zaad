'use client';

import { useState } from "react";
import { toast } from "sonner";
import Modal, { ModalButton, type ModalSize } from "./Modal";
import { SchemaField, type FieldDef } from "./Fields";

export type EntityValues = Record<string, string | boolean>;

/**
 * Schema-driven create/edit dialog shared by every admin module.
 * Fields lay out two-per-row unless marked `full`.
 */
export default function EntityFormModal({
  open,
  mode,
  entity,
  fields,
  initial,
  size = "md",
  subtitle,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  /** Singular noun, e.g. "supplier". */
  entity: string;
  fields: FieldDef[];
  initial?: EntityValues;
  size?: ModalSize;
  subtitle?: string;
  submitLabel?: string;
  onClose: () => void;
  /**
   * `files` carries anything picked by an image field, keyed by field name.
   * Return (or resolve) `false`, or throw, to keep the dialog open on failure;
   * return `true` when the caller has already announced success.
   */
  onSubmit?: (
    values: EntityValues,
    files: Record<string, File>
  ) => void | boolean | Promise<void | boolean>;
}) {
  const blank: EntityValues = Object.fromEntries(
    fields.map((f) => [f.name, f.type === "toggle" ? false : ""])
  );

  const [values, setValues] = useState<EntityValues>({ ...blank, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset when the dialog opens, or when it is reopened against a different
  // record. Done during render rather than in an effect so the first paint
  // already shows the right values.
  const openedFor = open ? `${mode}:${JSON.stringify(initial ?? {})}` : null;
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);

  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (openedFor) {
      setValues({ ...blank, ...initial });
      setErrors({});
      setFiles({});
    }
  }

  const set = (name: string, next: string | boolean) =>
    setValues((v) => ({ ...v, [name]: next }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Required = every non-toggle field that has no explicit help text marking it optional.
    const missing: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "toggle" || f.type === "image") continue;
      if (/optional/i.test(f.help ?? "")) continue;
      if (!String(values[f.name] ?? "").trim()) missing[f.name] = "This field is required";
    }

    if (Object.keys(missing).length) {
      setErrors(missing);
      return;
    }

    // Wait for the save: the dialog only closes (and only claims success)
    // once it has actually worked.
    setSubmitting(true);
    let result: void | boolean;
    try {
      result = await onSubmit?.(values, files);
    } catch (error: any) {
      setErrors(error?.errors ?? {});
      toast.error(error?.message ?? `Unable to save this ${entity}.`);
      return;
    } finally {
      setSubmitting(false);
    }

    if (result === false) return;
    if (result !== true) {
      toast.success(
        mode === "create"
          ? `${entity[0].toUpperCase()}${entity.slice(1)} created.`
          : `${entity[0].toUpperCase()}${entity.slice(1)} updated.`
      );
    }
    onClose();
  };

  const title = mode === "create" ? `New ${entity}` : `Edit ${entity}`;
  const formId = `entity-form-${entity.replace(/\s+/g, "-")}`;

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      size={size}
      onClose={onClose}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="dark" type="submit" form={formId} disabled={submitting}>
            {submitting
              ? "Saving…"
              : submitLabel ?? (mode === "create" ? `Create ${entity}` : "Save changes")}
          </ModalButton>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
            <SchemaField
              field={f}
              value={values[f.name] ?? ""}
              error={errors[f.name]}
              onChange={(next) => set(f.name, next)}
              onFile={(name, file) =>
                setFiles((prev) => {
                  const next = { ...prev };
                  if (file) next[name] = file;
                  else delete next[name];
                  return next;
                })
              }
            />
          </div>
        ))}
      </form>
    </Modal>
  );
}
