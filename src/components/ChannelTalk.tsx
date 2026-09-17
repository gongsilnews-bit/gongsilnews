"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { markChannelTalkBooted, type ChannelIOInstance } from "@/utils/channelTalk";

const PLUGIN_KEY =
  process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY ||
  "11833cf9-5aa3-4d72-bea4-425445a85a90";

/** 채널톡 미확인 답변 수가 바뀔 때 ChannelTalkLauncher 가 받는 이벤트 */
export const CHANNEL_TALK_BADGE_EVENT = "gongsil:channeltalk-badge";

/** 메신저 열림/닫힘이 바뀔 때 ChannelTalkLauncher 가 받는 이벤트 */
export const CHANNEL_TALK_VISIBILITY_EVENT = "gongsil:channeltalk-visibility";

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
     * 우하단 플로팅 버튼은 ChannelTalkLauncher 가 직접 그리고,
     * 빠른메뉴 / 푸터 / 모바일 메뉴의 "실시간 상담"에서도 openChannelTalk() 으로 연다.
     */
    function boot(extra: Record<string, unknown> = {}) {
      if (!window.ChannelIO) return;

      window.ChannelIO(
        "boot",
        { pluginKey: PLUGIN_KEY, hideChannelButtonOnBoot: true, ...extra },
        (error: unknown) => {
          markChannelTalkBooted(!error);
          if (error) return;

          // 기본 런처를 숨겼으므로 미확인 답변 배지도 직접 중계한다.
          window.ChannelIO?.("onBadgeChanged", (count: number) => {
            window.dispatchEvent(
              new CustomEvent(CHANNEL_TALK_BADGE_EVENT, { detail: count })
            );
          });

          // 상담 버튼(z-index 20000000)이 열린 메신저 위에 겹치지 않도록
          // 열림/닫힘을 중계해 버튼을 숨겼다 다시 띄운다.
          const emitVisibility = (visible: boolean) => {
            window.dispatchEvent(
              new CustomEvent(CHANNEL_TALK_VISIBILITY_EVENT, { detail: visible })
            );
          };
          window.ChannelIO?.("onShowMessenger", () => emitVisibility(true));
          window.ChannelIO?.("onHideMessenger", () => emitVisibility(false));
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
