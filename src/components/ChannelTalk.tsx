"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { markChannelTalkBooted, type ChannelIOInstance } from "@/utils/channelTalk";

const PLUGIN_KEY =
  process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY ||
  "11833cf9-5aa3-4d72-bea4-425445a85a90";

/**
 * 부팅은 페이지 로드당 한 번만. StrictMode 는 개발 모드에서 effect 를
 * mount -> cleanup -> mount 로 두 번 실행하는데, bootChannelTalk() 이 async 라
 * 첫 boot 가 cleanup 의 shutdown 뒤에 도착하고 두 번째 boot 가 뒤따르면서
 * 서로 경합해 boot 콜백이 에러로 떨어진다.
 */
let bootStarted = false;

export default function ChannelTalk() {
  useEffect(() => {
    if (bootStarted) return;
    bootStarted = true;

    // 1. 채널톡 공식 SDK 스크립트 비동기 주입
    (function () {
      const w = window;
      if (w.ChannelIO) {
        return;
      }
      const queue: IArguments[] = [];
      const ch = Object.assign(
        function () {
          // eslint-disable-next-line prefer-rest-params
          ch.c?.(arguments);
        },
        {
          q: queue,
          c: (args: IArguments) => {
            queue.push(args);
          },
        }
      ) as ChannelIOInstance;
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

    /**
     * 채널톡 기본 런처 버튼은 항상 숨긴다(hideChannelButtonOnBoot).
     * 상담창은 상시 노출되는 플로팅 버튼 없이, 헤더 커뮤니티 / 푸터 고객센터 /
     * 빠른메뉴 / 모바일 메뉴의 "실시간 상담"에서 openChannelTalk() 으로만 연다.
     */
    function boot(extra: Record<string, unknown> = {}) {
      if (!window.ChannelIO) return;

      window.ChannelIO(
        "boot",
        { pluginKey: PLUGIN_KEY, hideChannelButtonOnBoot: true, ...extra },
        (error: unknown) => {
          markChannelTalkBooted(!error);
        }
      );
    }

    // 2. 로그인 사용자 정보 확인 후 채널톡 부팅 (Boot)
    async function bootChannelTalk() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          boot(); // 비회원 익명 방문자
          return;
        }

        const { data: member } = await supabase
          .from("members")
          .select("name, phone, email, company_name")
          .eq("id", user.id)
          .maybeSingle();

        boot({
          memberId: user.id,
          profile: {
            name: member?.name || user.user_metadata?.name || "회원",
            mobileNumber: member?.phone || user.user_metadata?.phone || undefined,
            email: member?.email || user.email || undefined,
            company: member?.company_name || undefined,
          },
        });
      } catch {
        // 오류 발생 시에도 기본 부팅 진행
        boot();
      }
    }

    bootChannelTalk();
  }, []);

  return null;
}
