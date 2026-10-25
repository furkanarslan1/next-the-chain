// Uygulamanın ana ekrana yüklenebilirlik durumu (tarayıcı olaylarından beslenen küçük depo).
// useSyncExternalStore ile okunur; sunucuda ve ilk istemci çiziminde "gizli" kabul edilir.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaState = {
  // Ana ekrandan (yüklü uygulama olarak) açılmış.
  standalone: boolean;
  ios: boolean;
  // Tarayıcı gerçek yükleme isteğini destekliyor ve henüz yüklenmemiş (Android/Chrome).
  canPrompt: boolean;
  // Kullanıcı şeridi yakın zamanda kapattı.
  dismissed: boolean;
};

const SERVER: PwaState = { standalone: false, ios: false, canPrompt: false, dismissed: true };
const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

let snapshot: PwaState = SERVER;
let deferred: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function readDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function compute(): PwaState {
  const ua = navigator.userAgent;
  return {
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    ios:
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    canPrompt: deferred !== null,
    dismissed: readDismissed(),
  };
}

function emit() {
  snapshot = compute();
  listeners.forEach((listener) => listener());
}

// Olayları sayfa açılır açılmaz dinlemeye başlar (yükleme isteği erken gelebilir).
export function initPwaStore() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", emit);
  snapshot = compute();
}

export function subscribe(listener: () => void) {
  initPwaStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot() {
  initPwaStore();
  return snapshot;
}

export function getServerSnapshot() {
  return SERVER;
}

// Tarayıcının kendi yükleme penceresini açar (sadece canPrompt iken).
export async function promptInstall() {
  if (!deferred) return "unavailable" as const;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  emit();
  return outcome;
}

// Şeridi 7 gün gizler.
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage yoksa bu oturum için gizlemek yeterli.
  }
  emit();
}
