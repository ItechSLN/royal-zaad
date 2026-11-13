import BrandMark from "@/components/brand/BrandMark";

export default function AdminLogo() {
    return (
        <div className="flex items-center gap-3 px-2 pb-8">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--noir)] shadow-lg shadow-slate-950/15">
                <BrandMark size={28} className="text-[var(--gold)]" />
            </div>
            <div>
                <p className="text-base font-semibold tracking-tight">Royal Zaad</p>
                <p className="text-xs text-slate-500">Admin console</p>
            </div>
        </div>
    )
}
