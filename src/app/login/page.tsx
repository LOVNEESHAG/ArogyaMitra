"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserCircle } from "lucide-react";
import { signInEmailPassword, signUpEmailPassword } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"patient" | "doctor" | "pharmacyOwner">("patient");
  const [showPassword, setShowPassword] = React.useState(false);
  const [name, setName] = React.useState("");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState<null | string>(null);
  const [error, setError] = React.useState<string>("");

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!ignore && res.ok) {
          router.replace('/dashboard');
        }
      } catch {}
    })();
    return () => { ignore = true };
  }, [router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("signin");
    try {
      await signInEmailPassword(email, password);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to sign in");
    } finally {
      setLoading(null);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("signup");
    try {
      await signUpEmailPassword(email, password, role, name || undefined, photoFile);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to sign up");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 p-4">
      <div className="w-full max-w-md flex justify-end">
        <LanguageSwitcher variant="segmented" size="sm" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserCircle className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">{t("login.title", "Welcome to ArogyaMitra")}</CardTitle>
          <CardDescription>
            {t("login.subtitle", "Sign in to access your healthcare dashboard")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md" role="alert">
              {error}
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t("login.emailPlaceholder", "Email address")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={t("login.namePlaceholder", "Full name (for new accounts)")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.passwordPlaceholder", "Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("login.hidePassword", "Hide password") : t("login.showPassword", "Show password")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("login.photoLabel", "Profile photo (optional)")}</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                className="file:bg-transparent file:border-0 file:text-sm file:font-medium"
              />
              {photoFile && (
                <p className="text-xs text-muted-foreground">{t("login.photoSelected", "Selected:")} {photoFile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("login.roleLabel", "Select your role (for new accounts)")}</label>
              <Select value={role} onValueChange={(val) => setRole(val as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("login.rolePlaceholder", "Choose your role")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">{t("roles.patient", "Patient")}</SelectItem>
                  <SelectItem value="doctor">{t("roles.doctor", "Doctor")}</SelectItem>
                  <SelectItem value="pharmacyOwner">{t("roles.pharmacyOwner", "Pharmacy Owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={loading !== null}
                className="flex-1"
              >
                {loading === "signin" ? t("login.signingIn", "Signing in...") : t("login.signIn", "Sign in")}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleSignUp} 
                disabled={loading !== null}
                className="flex-1"
              >
                {loading === "signup" ? t("login.creatingAccount", "Creating...") : t("login.signUp", "Sign up")}
              </Button>
            </div>
          </form>
          
          <div className="text-center pt-4 border-t">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
              ← {t("login.backToHome", "Back to Home")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
