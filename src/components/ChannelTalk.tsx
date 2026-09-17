"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    ChannelIO?: any;
    ChannelIOInitialized?: boolean;
  }
}

const PLUGIN_KEY =
  process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY ||
  "11833cf9-5aa3-4d72-bea4-425445a85a90";

export default function ChannelTalk() {
  useEffect(() => {
    // 1. 채널톡 공식 SDK 스크립트 비동기 주입
    (function () {
      const w = window;
      if (w.ChannelIO) {
        return;
      }
      const ch = function () {
        ch.c(arguments);
      };
      ch.q = [] as any[];
      ch.c = function (args: any) {
        ch.q.push(args);
      };
      w.ChannelIO = ch;
      function l() {
        if (w.ChannelIOInitialized) {
          return;
        }
        w.ChannelIOInitialized = true;
        const s = document.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = "https://cdn.channel.io/plugin/ch-plugin-web.js";
        const x = document.getElementsByTagName("script")[0];
        if (x && x.parentNode) {
          x.parentNode.insertBefore(s, x);
        }
      }
      if (document.readyState === "complete") {
        l();
      } else {
        w.addEventListener("DOMContentLoaded", l);
        w.addEventListener("load", l);
      }
    })();

    // 2. 로그인 사용자 정보 확인 후 채널톡 부팅 (Boot)
    async function bootChannelTalk() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let profile: Record<string, any> = {};

        if (user) {
          const { data: member } = await supabase
            .from("members")
            .select("name, phone, email, company_name")
            .eq("id", user.id)
            .maybeSingle();

          profile = {
            name: member?.name || user.user_metadata?.name || "회원",
            mobileNumber: member?.phone || user.user_metadata?.phone || undefined,
            email: member?.email || user.email || undefined,
            company: member?.company_name || undefined,
          };

          if (window.ChannelIO) {
            window.ChannelIO("boot", {
              pluginKey: PLUGIN_KEY,
              memberId: user.id,
              profile: profile,
            });
          }
        } else {
          // 비회원 익명 방문자 부팅
          if (window.ChannelIO) {
            window.ChannelIO("boot", {
              pluginKey: PLUGIN_KEY,
            });
          }
        }
      } catch (e) {
        // 오류 발생 시에도 기본 부팅 진행
        if (window.ChannelIO) {
          window.ChannelIO("boot", {
            pluginKey: PLUGIN_KEY,
          });
        }
      }
    }

    bootChannelTalk();

    return () => {
      if (window.ChannelIO) {
        window.ChannelIO("shutdown");
      }
    };
  }, []);

  return null;
}
