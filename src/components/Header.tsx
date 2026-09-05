import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

import { getFollowUps, type FollowUp } from "../data/followUpStore";

type UserInfo = {
  name: string;
  email: string;
  initials: string;
  role: string;
};

export default function Header() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserInfo>({
    name: "User",
    email: "",
    initials: "U",
    role: "Sales",
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  /* =====================================================
     USER
  ===================================================== */

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
        role: "Administrator",
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
        role: "Administrator",
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =====================================================
     LOAD NOTIFICATIONS
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        setLoadingNotifications(true);

        const data = await getFollowUps();

        if (!mounted) return;

        setFollowUps(data);
      } catch (error) {
        console.error("Failed to load notifications:", error);

        if (mounted) {
          setFollowUps([]);
        }
      } finally {
        if (mounted) {
          setLoadingNotifications(false);
        }
      }
    }

    loadNotifications();

    /*
     * Refresh notifications when the browser window
     * receives focus again.
     */
    const handleFocus = () => {
      loadNotifications();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  /* =====================================================
     TODAY / OVERDUE FOLLOW-UPS
  ===================================================== */

  const getTodayString = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getTodayString();

  const pendingFollowUps = followUps.filter(
    (followUp) => followUp.status === "Pending",
  );

  const todayFollowUps = pendingFollowUps.filter(
    (followUp) => followUp.followUpDate === today,
  );

  const overdueFollowUps = pendingFollowUps.filter(
    (followUp) => followUp.followUpDate < today,
  );

  const notificationCount = todayFollowUps.length + overdueFollowUps.length;

  /* =====================================================
     CLOSE USER MENU WHEN CLICKING OUTSIDE
  ===================================================== */

  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showMenu]);

  /* =====================================================
     CLOSE NOTIFICATION PANEL WHEN CLICKING OUTSIDE
  ===================================================== */

  useEffect(() => {
    if (!showNotifications) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications]);

  /* =====================================================
     NOTIFICATION CLICK
  ===================================================== */

  const handleNotificationClick = (followUp: FollowUp) => {
    setShowNotifications(false);

    navigate(`/follow-ups/${followUp.id}`);
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

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

  /* =====================================================
     FOLLOW-UP ITEM
  ===================================================== */

  const NotificationItem = ({
    followUp,
    overdue = false,
  }: {
    followUp: FollowUp;
    overdue?: boolean;
  }) => {
    return (
      <button
        type="button"
        onClick={() => handleNotificationClick(followUp)}
        className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
              overdue
                ? "bg-red-100 text-red-600"
                : "bg-orange-100 text-orange-600"
            }`}
          >
            {overdue ? "!" : "•"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">
                {followUp.clientName || followUp.relatedName || "Follow-up"}
              </p>

              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  overdue
                    ? "bg-red-50 text-red-600"
                    : "bg-orange-50 text-orange-600"
                }`}
              >
                {overdue ? "Overdue" : "Today"}
              </span>
            </div>

            <p className="mt-1 truncate text-xs text-slate-500">
              {followUp.purpose || "Follow-up"}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-400">
              {followUp.followUpDate}
              {followUp.followUpTime ? ` • ${followUp.followUpTime}` : ""}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications((value) => !value);
              setShowMenu(false);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-xl transition hover:bg-slate-100"
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            🔔
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Notifications
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {notificationCount > 0
                      ? `${notificationCount} pending follow-up${
                          notificationCount === 1 ? "" : "s"
                        }`
                      : "No pending follow-ups"}
                  </p>
                </div>

                {notificationCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
                    {notificationCount} Pending
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="max-h-[420px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm text-slate-500">
                      Loading notifications...
                    </p>
                  </div>
                ) : notificationCount === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="text-3xl">✓</div>

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      All caught up
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      No today or overdue follow-ups.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Overdue */}
                    {overdueFollowUps.length > 0 && (
                      <div>
                        <div className="bg-red-50 px-4 py-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                            Overdue ({overdueFollowUps.length})
                          </p>
                        </div>

                        {overdueFollowUps.map((followUp) => (
                          <NotificationItem
                            key={`overdue-${followUp.id}`}
                            followUp={followUp}
                            overdue
                          />
                        ))}
                      </div>
                    )}

                    {/* Today */}
                    {todayFollowUps.length > 0 && (
                      <div>
                        <div className="bg-orange-50 px-4 py-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                            Today ({todayFollowUps.length})
                          </p>
                        </div>

                        {todayFollowUps.map((followUp) => (
                          <NotificationItem
                            key={`today-${followUp.id}`}
                            followUp={followUp}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {notificationCount > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/follow-ups");
                    }}
                    className="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-green-700 transition hover:bg-green-50"
                  >
                    View All Follow-ups →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200" />

        {/* =================================================
            USER + MENU
        ================================================= */}

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMenu((value) => !value);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
              {user.initials}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user.name}
              </p>

              <p className="text-xs text-slate-500">{user.role}</p>
            </div>

            <span className="ml-1 text-xs text-slate-400">▾</span>
          </button>

          {/* User Menu */}
          {showMenu && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  {user.name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {user.email}
                </p>

                <span className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  {user.role}
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
      </div>
    </header>
  );
}
