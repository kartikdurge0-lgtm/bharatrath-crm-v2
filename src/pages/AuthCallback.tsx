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
        const url = new URL(window.location.href);

        /* =================================================
           1. CHECK OAUTH ERROR FROM PROVIDER / SUPABASE
        ================================================= */

        const oauthError = url.searchParams.get("error");
        const oauthErrorCode = url.searchParams.get("error_code");
        const oauthErrorDescription = url.searchParams.get("error_description");

        if (oauthError || oauthErrorDescription) {
          console.error("OAuth callback error:", {
            oauthError,
            oauthErrorCode,
            oauthErrorDescription,
          });

          if (mounted) {
            setError(
              oauthErrorDescription ||
                oauthErrorCode ||
                oauthError ||
                "Google login failed.",
            );
          }

          return;
        }

        /* =================================================
           2. PKCE FLOW

           Supabase Google OAuth normally returns:

           /auth/callback?code=xxxxxxxx

           The code must be exchanged for a session.
        ================================================= */

        const code = url.searchParams.get("code");

        const flowId = url.searchParams.get("sb_flow_id");

        if (code) {
          console.log("OAuth authorization code found.");

          const exchangeResult = flowId
            ? await supabase.auth.exchangeCodeForSession(code, {
                flowId,
              })
            : await supabase.auth.exchangeCodeForSession(code);

          const { data, error: exchangeError } = exchangeResult;

          if (exchangeError) {
            console.error("OAuth code exchange error:", exchangeError);

            if (mounted) {
              setError(
                exchangeError.message || "Unable to create login session.",
              );
            }

            return;
          }

          console.log("OAuth session created:", !!data.session);

          if (!data.session) {
            if (mounted) {
              setError("Login session could not be created.");
            }

            return;
          }

          /* =================================================
             CLEAN CALLBACK URL

             Remove code/error parameters after successful
             session creation.
          ================================================= */

          window.history.replaceState({}, document.title, "/auth/callback");

          if (mounted) {
            navigate("/", { replace: true });
          }

          return;
        }

        /* =================================================
           3. BACKWARD COMPATIBILITY

           If an older/implicit-flow callback gives tokens
           in the URL hash, continue supporting it.
        ================================================= */

        const hash = window.location.hash.substring(1);

        if (hash) {
          const hashParams = new URLSearchParams(hash);

          const accessToken = hashParams.get("access_token");

          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            console.log("OAuth access/refresh tokens found in hash.");

            const { data, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              console.error("Set session error:", sessionError);

              if (mounted) {
                setError(
                  sessionError.message || "Unable to create login session.",
                );
              }

              return;
            }

            console.log("Hash session created:", !!data.session);

            if (!data.session) {
              if (mounted) {
                setError("Login session could not be created.");
              }

              return;
            }

            window.history.replaceState({}, document.title, "/auth/callback");

            if (mounted) {
              navigate("/", { replace: true });
            }

            return;
          }
        }

        /* =================================================
           4. CHECK EXISTING SESSION

           Useful when Supabase has already restored the
           session automatically.
        ================================================= */

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          console.error("Get session error:", sessionError);

          setError(sessionError.message || "Unable to retrieve login session.");

          return;
        }

        if (sessionData.session) {
          console.log("Existing session found.");

          navigate("/", { replace: true });

          return;
        }

        /* =================================================
           5. NOTHING FOUND
        ================================================= */

        setError(
          "Login session could not be created. Please try signing in again.",
        );
      } catch (err) {
        console.error("Authentication callback error:", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Login session could not be created.",
          );
        }
      }
    };

    void finishLogin();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-red-700">Login failed</h1>

          <p className="mt-3 break-words text-sm leading-6 text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-6 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     LOADING
  ===================================================== */

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-green-600" />

        <p className="text-sm text-slate-500">Completing sign in...</p>
      </div>
    </div>
  );
}
