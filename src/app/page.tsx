"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, FileText, ShoppingBag, Users, Phone, MapPin, Clock } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="ArogyaMitra logo"
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className="sr-only">ArogyaMitra home</span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <LanguageSwitcher className="hidden sm:inline-flex" variant="segmented" size="sm" />
            <Link href="/login" className="rounded-md border border-border px-4 py-2 transition hover:border-primary hover:text-primary">
              {t("landing.login", "Login")}
            </Link>
            <Button asChild size="sm" className="px-4">
              <Link href="/dashboard">{t("landing.dashboardCta", "Go to Dashboard")}</Link>
            </Button>
          </div>
        </div>
        <div className="px-4 sm:hidden">
          <LanguageSwitcher className="w-full" variant="select" size="md" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#FFF8F0] px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <Image
              src="/images/logo.png"
              alt="ArogyaMitra logo"
              width={220}
              height={80}
              className="h-16 w-auto"
              priority
            />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            {t("landing.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[#FFF8F0]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-headline font-bold text-primary mb-3">
            {t("landing.featuresTitle")}
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            {t("landing.featuresSubtitle")}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-primary/10 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader className="items-center text-center">
                <Stethoscope className="h-10 w-10 text-accent" />
                <CardTitle className="mt-4 text-primary">{t("landing.features.videoConsult")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("landing.features.videoConsultDesc")}
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-primary/10 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader className="items-center text-center">
                <FileText className="h-10 w-10 text-accent" />
                <CardTitle className="mt-4 text-primary">{t("landing.features.digitalRecords")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("landing.features.digitalRecordsDesc")}
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-primary/10 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader className="items-center text-center">
                <ShoppingBag className="h-10 w-10 text-accent" />
                <CardTitle className="mt-4 text-primary">{t("landing.features.medicineInventory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("landing.features.medicineInventoryDesc")}
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-primary/10 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader className="items-center text-center">
                <Users className="h-10 w-10 text-accent" />
                <CardTitle className="mt-4 text-primary">{t("landing.features.communitySupport")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("landing.features.communitySupportDesc")}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-[#FFF8F0]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-headline font-bold text-primary mb-3">
            {t("landing.howTitle")}
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            {t("landing.howSubtitle")}
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
                  {step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(`landing.how.step${step}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`landing.how.step${step}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Contact Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-headline font-bold text-primary mb-8">
            {t("landing.getInTouch")}
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="flex flex-col items-center p-6">
                <Phone className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">{t("landing.tollFreeLabel", "Toll Free")}</h3>
                <p className="text-muted-foreground">{t("landing.tollFree", "Toll-Free Number")}: 1800-XXX-XXXX</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center p-6">
                <MapPin className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">{t("landing.locationLabel", "Location")}</h3>
                <p className="text-muted-foreground">{t("landing.teamLocation")}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center p-6">
                <Clock className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">{t("landing.availabilityLabel", "Availability")}</h3>
                <p className="text-muted-foreground">{t("landing.availabilityDesc", "24/7 Support")}</p>
              </CardContent>
            </Card>
          </div>

          <Button asChild size="lg">
            <Link href="/login">{t("landing.getStartedCta", "Start Your Healthcare Journey")}</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("landing.footerTitle")}</h3>
              <p className="text-primary-foreground/80">
                {t("landing.footerDesc")}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footerPatients", "For Patients")}</h4>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>{t("landing.footerPatientsBook", "Book Consultations")}</li>
                <li>{t("landing.footerPatientsRecords", "Health Records")}</li>
                <li>{t("landing.footerPatientsMedicines", "Find Medicines")}</li>
                <li>{t("landing.footerPatientsAssistant", "AI Health Assistant")}</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footerProviders", "For Providers")}</h4>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>{t("landing.footerProvidersDashboard", "Doctor Dashboard")}</li>
                <li>{t("landing.footerProvidersRecords", "Patient Records")}</li>
                <li>{t("landing.footerProvidersPharmacy", "Pharmacy Management")}</li>
                <li>{t("landing.footerProvidersAnalytics", "Analytics")}</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footerSupport", "Support")}</h4>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>{t("landing.footerSupportHelp", "Help Center")}</li>
                <li>{t("landing.footerSupportContact", "Contact Us")}</li>
                <li>{t("landing.privacy")}</li>
                <li>{t("landing.terms")}</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>&copy; 2025 {t("landing.footerTitle")}. {t("landing.footerNote", "Built for Smart India Hackathon. Healthcare for every village.")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}