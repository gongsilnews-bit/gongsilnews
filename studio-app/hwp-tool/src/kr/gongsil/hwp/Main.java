// 공실뉴스 스튜디오 — 문서편집의 한글(.hwp) 변환기 (2026-10-22)
//  to-hwpx <in.hwp> <out.hwpx> : 예전 한글 파일 → .hwpx  (hwplib + hwp2hwpx, Apache-2.0)
//  to-hwp  <in.hwpx> <out.hwp> : 문서편집이 만든 .hwpx → 예전 한글 파일 (hwplib 로 직접 짓는다)
//  만들기: studio-app/hwp-tool/build.mjs
package kr.gongsil.hwp;

import kr.dogfoot.hwp2hwpx.Hwp2Hwpx;
import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.reader.HWPReader;
import kr.dogfoot.hwpxlib.object.HWPXFile;
import kr.dogfoot.hwpxlib.writer.HWPXWriter;

public class Main {
    /** 채우기 색의 맨 앞 바이트가 FF 면 "색 없음" — hwp2hwpx 는 0xFFFFFFFF 만 없음으로 보아 검정 칸이 되던 것을 바로잡는다 */
    static void fixColors(HWPFile hwp) {
        for (kr.dogfoot.hwplib.object.docinfo.BorderFill b : hwp.getDocInfo().getBorderFillList()) {
            kr.dogfoot.hwplib.object.docinfo.borderfill.fillinfo.PatternFill pf = b.getFillInfo().getPatternFill();
            if (pf != null && (pf.getBackColor().getValue() & 0xFF000000L) == 0xFF000000L) pf.getBackColor().setValue(0xFFFFFFFFL);
        }
    }

    public static void main(String[] a) {
        try {
            if (a.length < 1) throw new IllegalArgumentException("사용법: to-hwpx|to-hwp <입력> <출력>");
            switch (a[0]) {
                case "to-hwpx": {
                    HWPFile hwp = HWPReader.fromFile(a[1]);
                    if (hwp == null) throw new IllegalStateException("한글 파일을 읽지 못했어요");
                    fixColors(hwp);
                    HWPXFile x = Hwp2Hwpx.toHWPX(hwp);
                    HWPXWriter.toFilepath(x, a[2]);
                    break;
                }
                case "to-hwp":
                    new ToHwp().convert(a[1], a[2]);
                    break;
                case "version":
                    System.out.println("gongsil-hwp 1.0 (hwplib 1.1.10, hwpxlib 1.0.9, hwp2hwpx)");
                    return;
                default:
                    throw new IllegalArgumentException("모르는 명령: " + a[0]);
            }
            System.out.println("OK");
        } catch (Throwable e) {
            e.printStackTrace();
            System.err.println("ERROR: " + e);
            System.exit(1);
        }
    }
}
