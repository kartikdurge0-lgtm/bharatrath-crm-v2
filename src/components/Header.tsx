export default function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-5">
      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="flex items-center gap-3">
        {/* Notification */}

        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Notifications"
        >
          <span className="text-base">🔔</span>

          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* Divider */}

        <div className="h-7 w-px bg-slate-200" />

        {/* User */}

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
            V
          </div>

          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold text-slate-900">Vijay</p>

            <p className="mt-0.5 text-[10px] text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
