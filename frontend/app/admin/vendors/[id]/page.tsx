'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  BadgeCheck,
  ExternalLink,
  MailWarning,
  MapPin,
  Package,
  Percent,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import KpiCard from "@/components/admin/common/KpiCard";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import Modal, { ModalButton } from "@/components/admin/form/Modal";
import { FieldShell } from "@/components/admin/form/Fields";
import { StatusBadge } from "@/components/ui/Badge";
import { money, num, shortDate } from "@/lib/admin-adapters";
import {
  VENDOR_TRANSITIONS,
  changeVendorStatus,
  getMarketplaceSettings,
  getVendor,
  osmLink,
  updateShopLocation,
  updateVendorCommission,
  type AdminShop,
  type AdminVendorDetail,
  type VendorTargetStatus,
} from "@/services/marketplace-admin.service";
import {
  Detail,
  ErrorBox,
  ORDER_TONE,
  PanelState,
  ReasonDialog,
  SmallButton,
  VENDOR_TONE,
  errorLines,
  inputClass,
  label,
  personName,
} from "@/app/admin/marketplace/_components/bits";

const DAYS: [string, string][] = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

/** Renders { mon: [{open, close}] } (or plain strings) as one line per day. */
function OpeningHours({ value }: { value: unknown }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return <span className="text-[var(--ink-muted)]">Not set</span>;
  }
  const hours = value as Record<string, unknown>;
  const slot = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) {
      return v.length
        ? v.map((s: any) => (s && typeof s === "object" ? `${s.open}–${s.close}` : String(s))).join(", ")
        : "Closed";
    }
    return "—";
  };
  return (
    <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 font-body text-[11.5px]">
      {DAYS.map(([key, name]) => (
        <div key={key} className="contents">
          <span className="text-[var(--ink-muted)]">{name}</span>
          <span className="font-mono text-[var(--ink)]">{key in hours ? slot(hours[key]) : "Closed"}</span>
        </div>
      ))}
    </div>
  );
}

const ACTIONS: Record<
  VendorTargetStatus,
  { button: string; title: string; reason: boolean; variant: "dark" | "danger" }
> = {
  ACTIVE: { button: "Approve", title: "Approve vendor", reason: false, variant: "dark" },
  REJECTED: { button: "Reject", title: "Reject application", reason: true, variant: "danger" },
  SUSPENDED: { button: "Suspend", title: "Suspend vendor", reason: true, variant: "danger" },
};

export default function VendorDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [vendor, setVendor] = useState<AdminVendorDetail | null>(null);
  const [loadError, setLoadError] = useState<any>(null);
  const [defaultRate, setDefaultRate] = useState<number | null>(null);

  const [statusTarget, setStatusTarget] = useState<VendorTargetStatus | null>(null);
  const [statusError, setStatusError] = useState<any>(null);
  const [dialogError, setDialogError] = useState<any>(null);

  const [commission, setCommission] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);

  const [locationOpen, setLocationOpen] = useState(false);

  const [nonce, setNonce] = useState(0);
  const load = useCallback(() => {
    setLoadError(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVendor(id).then(
      (data) => {
        if (cancelled) return;
        setVendor(data);
        setCommission(data.commissionRate === null ? "" : String(data.commissionRate));
        setLoadError(null);
      },
      (error) => !cancelled && setLoadError(error)
    );
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  useEffect(() => {
    getMarketplaceSettings()
      .then((s) => setDefaultRate(s.commissionRate))
      .catch(() => setDefaultRate(null));
  }, []);

  if (!vendor) {
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink />
        <Card>
          <PanelState loading={!loadError} error={loadError} noun="this vendor" onRetry={load} />
        </Card>
      </div>
    );
  }

  const shop = vendor.shop;
  const transitions = vendor.isPlatform ? [] : VENDOR_TRANSITIONS[vendor.status];

  const actionLabel = (to: VendorTargetStatus) =>
    to === "ACTIVE" && vendor.status === "SUSPENDED" ? "Reactivate" : ACTIONS[to].button;

  const openStatus = (to: VendorTargetStatus) => {
    setDialogError(null);
    setStatusTarget(to);
  };

  const submitStatus = async (reason: string) => {
    if (!statusTarget) return false;
    try {
      const res = await changeVendorStatus(vendor.id, {
        status: statusTarget,
        ...(reason ? { reason } : {}),
      });
      setVendor(res.vendor);
      setCommission(res.vendor.commissionRate === null ? "" : String(res.vendor.commissionRate));
      setStatusError(null);
      toast.success(res.message);
      return true;
    } catch (error: any) {
      setDialogError(error);
      setStatusError(error);
      toast.error(errorLines(error, "Unable to change the vendor's status.")[0]);
      return false;
    }
  };

  const saveCommission = async () => {
    const raw = commission.trim();
    const rate = raw === "" ? null : Number(raw);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      setCommissionError("Enter a percentage between 0 and 100, or leave blank for the platform default.");
      return;
    }
    setSavingCommission(true);
    try {
      const updated = await updateVendorCommission(vendor.id, rate);
      setVendor(updated);
      setCommission(updated.commissionRate === null ? "" : String(updated.commissionRate));
      setCommissionError(null);
      toast.success(rate === null ? "Commission reset to the platform default." : `Commission set to ${rate}%.`);
    } catch (error: any) {
      const lines = errorLines(error, "Unable to update the commission.");
      setCommissionError(lines.join(" "));
      toast.error(lines[lines.length - 1]);
    } finally {
      setSavingCommission(false);
    }
  };

  const onLocationSaved = (next: AdminShop) => {
    setVendor((v) => (v && v.shop ? { ...v, shop: { ...v.shop, ...next } } : v));
    // A missing location may have been the only thing blocking approval.
    if (statusError?.errors?.location) setStatusError(null);
  };

  const address = shop
    ? [
        shop.addressLine1,
        shop.addressLine2,
        [shop.postalCode, shop.city].filter(Boolean).join(" "),
        shop.state,
        shop.country,
      ].filter((p) => p && String(p).trim())
    : [];

  const hasCoords = shop?.latitude != null && shop?.longitude != null;
  const effectiveRate = vendor.commissionRate ?? defaultRate;

  return (
    <div className="flex flex-col gap-[18px]">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-[var(--ink)]">
              {shop?.name ?? "No shop yet"}
            </h2>
            <StatusBadge tone={VENDOR_TONE[vendor.status]}>{label(vendor.status)}</StatusBadge>
            {vendor.isPlatform && (
              <span className="font-mono text-[10px] uppercase tracking-[1.2px] text-[var(--gold-deep)]">
                Platform vendor
              </span>
            )}
          </div>
          <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
            {shop ? `/${shop.slug} · ` : ""}Applied {shortDate(vendor.createdAt)}
            {vendor.approvedAt ? ` · Approved ${shortDate(vendor.approvedAt)}` : ""}
          </p>
          {vendor.statusReason && (
            <p className="font-body text-[11.5px] text-[var(--ink)]">
              <span className="font-semibold">Reason on record:</span> {vendor.statusReason}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vendor.isPlatform ? (
            <span className="font-body text-[11px] text-[var(--ink-muted)]">
              The platform&apos;s own shop can&apos;t be approved, suspended or rejected.
            </span>
          ) : (
            transitions.map((to) => (
              <ModalButton key={to} variant={ACTIONS[to].variant} onClick={() => openStatus(to)}>
                {actionLabel(to)}
              </ModalButton>
            ))
          )}
        </div>
      </div>

      {statusError && <ErrorBox error={statusError} />}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Products" value={num(vendor.stats.productCount)} icon={Package} note="listed by this shop" />
        <KpiCard label="Sub-orders" value={num(vendor.stats.orderCount)} icon={ShoppingCart} note="all time" />
        <KpiCard label="Gross sales" value={money(vendor.stats.grossSales)} icon={Banknote} note="excl. cancelled" />
        <KpiCard
          label="Commission"
          value={effectiveRate === null ? "—" : `${effectiveRate}%`}
          icon={Percent}
          note={vendor.commissionRate === null ? "platform default" : "custom rate"}
        />
      </div>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-3">
        {/* Owner */}
        <Card>
          <PanelHeading title="Owner" subtitle="The account that runs this shop" />
          <dl className="grid grid-cols-1 gap-4 px-5 pb-5">
            <Detail term="Name">{personName(vendor.user)}</Detail>
            <Detail term="Email">
              <span className="inline-flex flex-wrap items-center gap-2">
                {vendor.user?.email ?? "—"}
                {vendor.user &&
                  (vendor.user.emailVerifiedAt ? (
                    <StatusBadge tone="success">
                      <span className="inline-flex items-center gap-1"><BadgeCheck size={11} /> Verified</span>
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">
                      <span className="inline-flex items-center gap-1"><MailWarning size={11} /> Not verified</span>
                    </StatusBadge>
                  ))}
              </span>
            </Detail>
            <Detail term="Joined">{shortDate(vendor.createdAt)}</Detail>
          </dl>
        </Card>

        {/* Shop */}
        <Card className="xl:col-span-2">
          <PanelHeading title="Shop" subtitle="Contact, address and fulfilment as entered by the vendor" />
          {shop ? (
            <dl className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
              <Detail term="Description">{shop.description || "—"}</Detail>
              <Detail term="Contact">
                <span className="flex flex-col">
                  <span>{shop.email || "—"}</span>
                  <span>{shop.phone || "—"}</span>
                </span>
              </Detail>
              <Detail term="Address">
                {address.length ? (
                  <span className="flex flex-col">
                    {address.map((line) => (
                      <span key={String(line)}>{line}</span>
                    ))}
                  </span>
                ) : (
                  <span className="text-[var(--danger)]">No address</span>
                )}
              </Detail>
              <Detail term="Opening hours">
                <OpeningHours value={shop.openingHours} />
              </Detail>
              <Detail term="Fulfilment">
                <span className="flex flex-wrap gap-2">
                  <StatusBadge tone={shop.offersDelivery ? "success" : "neutral"}>
                    Delivery {shop.offersDelivery ? "on" : "off"}
                  </StatusBadge>
                  <StatusBadge tone={shop.offersPickup ? "success" : "neutral"}>
                    Pickup {shop.offersPickup ? "on" : "off"}
                  </StatusBadge>
                </span>
              </Detail>
              <Detail term="Delivery terms">
                <span className="flex flex-col">
                  <span>Radius: {shop.deliveryRadiusKm != null ? `${shop.deliveryRadiusKm} km` : "anywhere"}</span>
                  <span>Flat shipping: {shop.shippingFlatFee != null ? money(shop.shippingFlatFee) : "—"}</span>
                  <span>Free over: {shop.freeShippingOver != null ? money(shop.freeShippingOver) : "—"}</span>
                </span>
              </Detail>
            </dl>
          ) : (
            <p className="px-5 pb-5 font-body text-[12px] text-[var(--ink-muted)]">
              This vendor hasn&apos;t set up a shop yet.
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        {/* Location */}
        <Card>
          <PanelHeading
            title="Location"
            subtitle="Distances are only computed from a verified location"
            action={
              shop ? (
                <SmallButton onClick={() => setLocationOpen(true)}>
                  <MapPin size={12} /> Set location
                </SmallButton>
              ) : undefined
            }
          />
          <dl className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <Detail term="Status">
              {shop?.locationVerifiedAt ? (
                <StatusBadge tone="success">Verified {shortDate(shop.locationVerifiedAt)}</StatusBadge>
              ) : (
                <StatusBadge tone="warning">Not verified</StatusBadge>
              )}
            </Detail>
            <Detail term="Coordinates">
              {hasCoords ? (
                <span className="flex flex-col gap-1">
                  <span className="font-mono">
                    {shop!.latitude}, {shop!.longitude}
                  </span>
                  <a
                    href={osmLink(shop!.latitude!, shop!.longitude!)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[var(--gold-deep)] hover:underline"
                  >
                    View on OpenStreetMap <ExternalLink size={11} />
                  </a>
                </span>
              ) : (
                <span className="text-[var(--ink-muted)]">Not set — located on approval, or set manually.</span>
              )}
            </Detail>
          </dl>
        </Card>

        {/* Commission */}
        <Card>
          <PanelHeading
            title="Commission"
            subtitle={
              defaultRate === null
                ? "Leave blank to use the platform default"
                : `Leave blank to use the platform default (${defaultRate}%)`
            }
          />
          <div className="flex flex-col gap-3 px-5 pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <FieldShell label="COMMISSION RATE (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={commission}
                  disabled={vendor.isPlatform}
                  placeholder={defaultRate === null ? "Platform default" : `Default · ${defaultRate}`}
                  onChange={(e) => {
                    setCommission(e.target.value);
                    setCommissionError(null);
                  }}
                  className={inputClass}
                />
              </FieldShell>
              <div className="shrink-0">
                <ModalButton variant="dark" onClick={saveCommission} disabled={savingCommission || vendor.isPlatform}>
                  {savingCommission ? "Saving…" : "Save rate"}
                </ModalButton>
              </div>
            </div>
            {vendor.isPlatform && (
              <p className="font-body text-[11px] text-[var(--ink-muted)]">The platform&apos;s own shop pays no commission.</p>
            )}
            {commissionError && (
              <p role="alert" className="font-body text-[11px] text-[var(--danger)]">{commissionError}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent sub-orders */}
      <Card>
        <PanelHeading title="Recent sub-orders" subtitle="This shop's part of the latest checkouts" />
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Status</TH>
              <TH>Fulfilment</TH>
              <TH align="right">Total</TH>
              <TH align="right">Commission</TH>
              <TH align="right">Vendor net</TH>
              <TH>Payout</TH>
              <TH>Placed</TH>
            </tr>
          </THead>
          <TBody>
            {vendor.recentSubOrders.length === 0 ? (
              <EmptyRow colSpan={8}>No orders for this shop yet.</EmptyRow>
            ) : (
              vendor.recentSubOrders.map((so) => (
                <TR key={so.id}>
                  <TD strong mono>
                    <Link href={`/admin/orders/${so.orderId}`} className="hover:text-[var(--gold-deep)]">
                      {so.orderNumber}
                    </Link>
                  </TD>
                  <TD>
                    <StatusBadge tone={ORDER_TONE[so.status] ?? "neutral"}>{label(so.status)}</StatusBadge>
                  </TD>
                  <TD>{label(so.fulfillmentMethod)}</TD>
                  <TD align="right" mono>{money(so.total)}</TD>
                  <TD align="right" mono>{money(so.commissionAmount)}</TD>
                  <TD align="right" strong>{money(so.vendorNet)}</TD>
                  <TD>
                    {so.payoutId ? (
                      <Link href={`/admin/payouts/${so.payoutId}`} className="font-semibold text-[var(--gold-deep)] hover:underline">
                        View payout
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>{shortDate(so.createdAt)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <ReasonDialog
        open={statusTarget !== null}
        title={statusTarget ? (statusTarget === "ACTIVE" && vendor.status === "SUSPENDED" ? "Reactivate vendor" : ACTIONS[statusTarget].title) : ""}
        subtitle={
          statusTarget === "ACTIVE"
            ? vendor.status === "SUSPENDED"
              ? "Their published products become visible to customers again."
              : "Needs a verified email, a complete shop address and a locatable address."
            : statusTarget === "SUSPENDED"
              ? "Their products are hidden from the storefront. Open sub-orders are left for admins to handle."
              : "The vendor is emailed this reason."
        }
        fieldLabel={statusTarget && ACTIONS[statusTarget].reason ? "REASON" : "NOTE"}
        placeholder={statusTarget && ACTIONS[statusTarget].reason ? "Shared with the vendor" : "Optional note for the audit trail"}
        required={statusTarget ? ACTIONS[statusTarget].reason : true}
        submitLabel={statusTarget ? actionLabel(statusTarget) : "Save"}
        variant={statusTarget ? ACTIONS[statusTarget].variant : "dark"}
        error={dialogError}
        onClose={() => setStatusTarget(null)}
        onSubmit={(text) => submitStatus(text)}
      />

      {shop && (
        <LocationDialog
          open={locationOpen}
          shop={shop}
          onClose={() => setLocationOpen(false)}
          onSaved={onLocationSaved}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/vendors"
      className="inline-flex w-fit items-center gap-1.5 font-body text-[11.5px] font-semibold text-[var(--gold-deep)] hover:text-[var(--ink)]"
    >
      <ArrowLeft size={13} /> Back to vendors
    </Link>
  );
}

/** Manual location verification: the admin enters coordinates and checks them on the map. */
function LocationDialog({
  open,
  shop,
  onClose,
  onSaved,
}: {
  open: boolean;
  shop: AdminShop;
  onClose: () => void;
  onSaved: (shop: AdminShop) => void;
}) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLat(shop.latitude != null ? String(shop.latitude) : "");
      setLng(shop.longitude != null ? String(shop.longitude) : "");
      setError(null);
    }
  }

  const latN = Number(lat);
  const lngN = Number(lng);
  const valid =
    lat.trim() !== "" && lng.trim() !== "" &&
    Number.isFinite(latN) && Number.isFinite(lngN) &&
    latN >= -90 && latN <= 90 && lngN >= -180 && lngN <= 180;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError({ message: "Latitude must be between -90 and 90 and longitude between -180 and 180." });
      return;
    }
    setBusy(true);
    try {
      const updated = await updateShopLocation(shop.id, { latitude: latN, longitude: lngN });
      onSaved(updated);
      toast.success("Shop location verified.");
      onClose();
    } catch (err: any) {
      setError(err);
      toast.error(errorLines(err, "Unable to save the location.")[0]);
    } finally {
      setBusy(false);
    }
  };

  const address = [shop.addressLine1, shop.city, shop.postalCode, shop.country].filter(Boolean).join(", ");

  return (
    <Modal
      open={open}
      title="Set shop location"
      subtitle={address ? `Address on file: ${address}` : "No address on file"}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="dark" type="submit" form="shop-location-form" disabled={busy}>
            {busy ? "Saving…" : "Save & verify"}
          </ModalButton>
        </>
      }
    >
      <form id="shop-location-form" onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="LATITUDE">
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="24.7136" className={inputClass} />
          </FieldShell>
          <FieldShell label="LONGITUDE">
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="46.6753" className={inputClass} />
          </FieldShell>
        </div>
        {valid ? (
          <a
            href={osmLink(latN, lngN)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 font-body text-[11.5px] font-semibold text-[var(--gold-deep)] hover:underline"
          >
            Check this point on OpenStreetMap <ExternalLink size={11} />
          </a>
        ) : (
          <span className="font-body text-[11px] text-[var(--ink-muted)]">
            Enter coordinates to preview them on OpenStreetMap before saving.
          </span>
        )}
        <ErrorBox error={error} />
      </form>
    </Modal>
  );
}
