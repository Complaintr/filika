"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { type Application, applicationPath, fetchApplications } from "@/services/applications-api";

interface ApplicationContextValue {
  application: Application | null;
  applications: Application[];
  refresh(): void;
}
const Context = createContext<ApplicationContextValue>({
  application: null,
  applications: [],
  refresh: () => {},
});
export const useApplication = () => useContext(Context);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ appSlug?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: version explicitly retries the request.
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetchApplications(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setApplications(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [version]);
  const application = applications?.find((app) => app.slug === params.appSlug) ?? null;
  const legacy =
    ["/", "/dashboard", "/complaints", "/settings"].includes(pathname) ||
    pathname.startsWith("/complaints/");
  useEffect(() => {
    if (!applications) return;
    if (!applications.length && pathname !== "/account") {
      router.replace("/onboarding");
      return;
    }
    const first = applications[0];
    if (legacy && first) {
      const page = pathname === "/" ? "/dashboard" : pathname;
      router.replace(`/${first.slug}${page}${window.location.search}`);
    }
  }, [applications, legacy, pathname, router]);
  if (error)
    return (
      <main className="page-section">
        <h1>Unable to load applications</h1>
        <p>Check your connection and try again.</p>
        <button className="studio-button" type="button" onClick={() => setVersion((n) => n + 1)}>
          Try again
        </button>
      </main>
    );
  if (!applications || legacy || (!applications.length && pathname !== "/account"))
    return (
      <main className="page-section" role="status">
        Loading your applications…
      </main>
    );
  if (params.appSlug && !application)
    return (
      <main className="page-section">
        <h1>Application not found</h1>
        <p>This application is unavailable or does not belong to your account.</p>
        <Link
          className="studio-button"
          href={
            applications[0] ? applicationPath(applications[0].slug, "complaints") : "/onboarding"
          }
        >
          Back to your applications
        </Link>
      </main>
    );
  return (
    <Context.Provider
      value={{ application, applications, refresh: () => setVersion((n) => n + 1) }}
    >
      {children}
    </Context.Provider>
  );
}
