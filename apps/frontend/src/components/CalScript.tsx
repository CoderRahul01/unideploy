"use client";
import { useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cal: any;
  }
}

export default function CalScript() {
  useEffect(() => {
    if (typeof window === "undefined" || window.Cal) return;

    (function (C: Window & typeof globalThis, A: string, L: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (a: any, ar: unknown[]) => { a.q.push(ar); };
      const d = C.document;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      C.Cal = function (...args: any[]) {
        const cal = C.Cal;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const s = d.createElement("script");
          s.src = A;
          d.head.appendChild(s);
          cal.loaded = true;
        }
        if (args[0] === L) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const api: any = (...a: unknown[]) => p(api, a);
          const ns = args[1];
          api.q = api.q || [];
          if (typeof ns === "string") {
            cal.ns[ns] = cal.ns[ns] || api;
            p(cal.ns[ns], args);
            p(cal, ["initNamespace", ns]);
          } else {
            p(cal, args);
          }
          return;
        }
        p(cal, args);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    window.Cal("init", "unideploy-demo", { origin: "https://app.cal.com" });
    window.Cal.ns["unideploy-demo"]("ui", {
      hideEventTypeDetails: false,
      layout: "month_view",
    });
  }, []);

  return null;
}
