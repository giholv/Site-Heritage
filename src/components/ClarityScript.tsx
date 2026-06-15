import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const CLARITY_ID = "x2c3lpblet";

export default function ClarityScript() {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");

    if (isAdmin) return;
    if (document.getElementById("clarity-script")) return;

    const script = document.createElement("script");
    script.id = "clarity-script";
    script.type = "text/javascript";
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");
    `;

    document.head.appendChild(script);
  }, [location.pathname]);

  return null;
}