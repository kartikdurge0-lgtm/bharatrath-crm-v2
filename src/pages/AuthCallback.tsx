import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const finishLogin = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        console.log("OAuth tokens found:", !!accessToken, !!refreshToken);

        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Set session error:", sessionError);

            if (mounted) {
              setError(sessionError.message);
            }

            return;
          }

          console.log("Session created:", !!data.session);

          if (data.session && mounted) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            );

            navigate("/", { replace: true });
          }

          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error("Auth session error:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (session) {
          navigate("/", { replace: true });
          return;
        }

        setError("Login session could not be created.");
      } catch (err) {
        console.error("Authentication error:", err);

        if (mounted) {
          setError("Login session could not be created.");
        }
      }
    };

    finishLogin();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-red-700">Login failed</h1>

          <p className="mt-3 text-sm text-slate-600">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-green-600" />

        <p className="text-sm text-slate-500">Completing sign in...</p>
      </div>
    </div>
  );
}
