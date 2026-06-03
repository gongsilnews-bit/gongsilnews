"use client";

import { useEffect } from "react";
import { handleLocationPermissionDenied, handleLocationUnavailable } from "@/utils/locationPermission";

export default function LocationPermissionInitializer() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // setTimeout to avoid blocking initial render
    const timer = setTimeout(() => {
      const hasPrompted = localStorage.getItem("app_location_prompted");
      
      if (!hasPrompted) {
        // ?±ì„ ì²˜ìŒ ?¤ì¹˜(ë°©ë¬¸)?ˆì„ ???„ì¹˜ ?•ë³´ ?¬ìš© ?˜ì‚¬ë¥?ë¬»ìŠµ?ˆë‹¤.
        const askForLocation = confirm("ê³µì‹¤?´ìŠ¤ ?±ì— ?¤ì‹  ê²ƒì„ ?˜ì˜?©ë‹ˆ??\n\n?„ìž¬ ?„ì¹˜ë¥?ê¸°ë°˜?¼ë¡œ ??ì£¼ë? ë¶€?™ì‚° ?´ìŠ¤?€ ?¤ì‹œê°?ê³µì‹¤ê´‘ê³ ???•ì¸?˜ì‹œê² ìŠµ?ˆê¹Œ?\n(?„ì¹˜ ê¶Œí•œ ?ˆìš©???„ìš”?©ë‹ˆ??");
        
        if (askForLocation) {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                // ê¶Œí•œ ?ˆìš© ë°??„ì¹˜ ?ë“ ?±ê³µ
                localStorage.setItem("app_location_prompted", "true");
              },
              (error) => {
                // ê¶Œí•œ ê±°ë? ?ëŠ” ?¤íŒ¨
                localStorage.setItem("app_location_prompted", "true");
                
                // ?¬ìš©?ê? ëª…ì‹œ?ìœ¼ë¡?ê±°ë???ê²½ìš° ?¤ì • ?”ë©´?¼ë¡œ ? ë„
                if (error.code === 1 /* PERMISSION_DENIED */) {
                  handleLocationPermissionDenied();
                }
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          } else {
            handleLocationUnavailable();
            localStorage.setItem("app_location_prompted", "true");
          }
        } else {
          // ?¬ìš©?ê? ì·¨ì†Œë¥??„ë¥¸ ê²½ìš°?ë„ ?¤ìŒ???¤ì‹œ ë¬»ì? ?Šë„ë¡?ì²˜ë¦¬
          localStorage.setItem("app_location_prompted", "true");
        }
      }
    }, 1500); // ?˜ì´ì§€ ë¡œë“œ ??1.5ì´??¤ì— ?ì—…

    return () => clearTimeout(timer);
  }, []);

  return null;
}
