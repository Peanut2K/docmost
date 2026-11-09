import { LoginForm } from "@/features/auth/components/login-form";
import { useTranslation } from "react-i18next";
import { DocumentTitle } from "@/components/ui/document-title.tsx";

// pinup-km fork: with Cloudflare Access on, skip the form and sign in with the Access identity.
// /login?password=1 keeps the password form as a break-glass path.
export default function LoginPage() {
  const { t } = useTranslation();
  const params = new URLSearchParams(window.location.search);

  if (String(window.CONFIG?.CF_ACCESS) === "true" && !params.has("password")) {
    const redirect = params.get("redirect");
    window.location.replace(
      "/api/auth/cf-access" +
        (redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""),
    );
    return null;
  }

  return (
    <>
      <DocumentTitle title={t("Login")} />
      <LoginForm />
    </>
  );
}
