"use client";

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * notifications 테이블 INSERT 를 구독한다.
 *
 * 토픽을 인스턴스마다 다르게 주는 것이 핵심이다. supabase 는 토픽이 같으면 채널
 * 객체를 재사용하기 때문에, 한 화면에 종이 둘(헤더 상단바 + 스티키 헤더)이거나
 * 이펙트가 두 번 돌면 이미 subscribe() 된 채널에 .on() 을 걸게 되고
 * "cannot add `postgres_changes` callbacks ... after `subscribe()`" 로 죽는다.
 *
 * onInsert 는 ref 로 들고 있어서 콜백 아이덴티티가 바뀌어도 채널을 다시 만들지
 * 않는다. (isAdmin 이 뒤늦게 확정되며 load 가 새로 만들어지는 경우가 있다)
 */
export function useNotificationsRealtime(userId: string | null, onInsert: () => void) {
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const handlerRef = useRef(onInsert);

  useEffect(() => {
    handlerRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}-${instanceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        handlerRef.current();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, instanceId]);
}
