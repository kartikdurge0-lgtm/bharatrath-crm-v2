import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type UserInfo = {
  name: string;
  email: string;
  initials: string;
};

export default function Header() {
  const [user, setUser] = useState<UserInfo>({
    name: "User",
    email: "",
    initials: "U",
  });

  const [showMenu, setShowMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      const email = user.email || "";

      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part.charAt(0).toUpperCase())
        .join("");

      setUser({
        name,
        email,
        initials: initials || "U",
      });
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;

      const currentUser = session.user;

      const name =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split("@")[0] ||
        "User";

      const email = currentUser.email || "";

      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part.charAt(0).toUpperCase())
        .join("");

      setUser({
        name,
        email,
        initials: initials || "U",
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      return;
    }

    window.location.href = "/login";
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-xl transition hover:bg-slate-100"
          aria-label="Notifications"
        >
          🔔
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        {/* User */}
        <button
          type="button"
          onClick={() => setShowMenu((value) => !value)}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
            {user.initials}
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>

            <p className="text-xs text-slate-500">Administrator</p>
          </div>

          <span className="ml-1 text-xs text-slate-400">▾</span>
        </button>

        {/* User Menu */}
        {showMenu && (
          <div className="absolute right-4 top-14 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <div className="border-b border-slate-100 px-3 py-3">
              <p className="text-sm font-semibold text-slate-800">
                {user.name}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500">
                {user.email}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                Administrator
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <span>↪</span>
              {loggingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
