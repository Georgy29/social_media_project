const ROUTE_SCROLL_PREFIX = "route-scroll:";

export function getRouteScrollKey(pathname: string, search = ""): string {
  return `${pathname}${search}`;
}

export function rememberRouteScroll(routeKey: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    `${ROUTE_SCROLL_PREFIX}${routeKey}`,
    String(window.scrollY),
  );
}

export function restoreRouteScroll(routeKey: string): boolean {
  if (typeof window === "undefined") return false;

  const storageKey = `${ROUTE_SCROLL_PREFIX}${routeKey}`;
  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return false;

  const targetY = Number(raw);
  if (Number.isNaN(targetY)) {
    window.sessionStorage.removeItem(storageKey);
    return false;
  }

  const attemptRestore = (retriesLeft: number) => {
    const maxScrollableY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const clampedTarget = Math.min(targetY, maxScrollableY);
    window.scrollTo({ top: clampedTarget, behavior: "auto" });

    if (retriesLeft <= 0 || maxScrollableY >= targetY) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.requestAnimationFrame(() => attemptRestore(retriesLeft - 1));
  };

  attemptRestore(10);
  return true;
}
