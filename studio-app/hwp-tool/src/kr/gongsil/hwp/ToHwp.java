// 문서편집이 만든 .hwpx (OWPML) → 예전 한글 .hwp (HWP 5.0)
//  문서편집 hwpx.ts 가 쓰는 범위만 옮긴다: 글꼴 · 글자 모양 · 문단 모양 · 칸 테두리/채우기 · 문단 · 표(병합) · 그림 ·
//  머리글/바닥글 · 쪽 번호 · 각주(문서 끝 목록으로) · 용지·여백
package kr.gongsil.hwp;

import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.object.bodytext.Section;
import kr.dogfoot.hwplib.object.bodytext.control.*;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.CtrlHeaderGso;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.*;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.header.HeaderFooterApplyPage;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.pagenumberposition.NumberPosition;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.autonumber.NumberSort;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.sectiondefine.TextDirection;
import kr.dogfoot.hwplib.object.bodytext.control.gso.ControlRectangle;
import kr.dogfoot.hwplib.object.bodytext.control.gso.GsoControlType;
import kr.dogfoot.hwplib.object.bodytext.control.gso.shapecomponent.ShapeComponentNormal;
import kr.dogfoot.hwplib.object.bodytext.control.gso.shapecomponent.lineinfo.*;
import kr.dogfoot.hwplib.object.bodytext.control.gso.shapecomponent.shadowinfo.ShadowInfo;
import kr.dogfoot.hwplib.object.bodytext.control.gso.shapecomponent.shadowinfo.ShadowType;
import kr.dogfoot.hwplib.object.bodytext.control.gso.shapecomponenteach.ShapeComponentRectangle;
import kr.dogfoot.hwplib.object.bodytext.control.gso.textbox.LineChange;
import kr.dogfoot.hwplib.object.bodytext.control.gso.textbox.TextVerticalAlignment;
import kr.dogfoot.hwplib.object.bodytext.control.sectiondefine.NumberShape;
import kr.dogfoot.hwplib.object.bodytext.control.sectiondefine.PageDef;
import kr.dogfoot.hwplib.object.bodytext.control.sectiondefine.PaperDirection;
import kr.dogfoot.hwplib.object.bodytext.control.table.*;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
import kr.dogfoot.hwplib.object.bodytext.paragraph.ParagraphList;
import kr.dogfoot.hwplib.object.bodytext.paragraph.charshape.ParaCharShape;
import kr.dogfoot.hwplib.object.bodytext.paragraph.header.ParaHeader;
import kr.dogfoot.hwplib.object.bodytext.paragraph.lineseg.LineSegItem;
import kr.dogfoot.hwplib.object.bodytext.paragraph.lineseg.ParaLineSeg;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.HWPCharControlChar;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.HWPCharControlExtend;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.HWPCharControlInline;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.ParaText;
import kr.dogfoot.hwplib.object.docinfo.*;
import kr.dogfoot.hwplib.object.docinfo.bindata.BinDataCompress;
import kr.dogfoot.hwplib.object.docinfo.bindata.BinDataState;
import kr.dogfoot.hwplib.object.docinfo.bindata.BinDataType;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BackSlashDiagonalShape;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BorderThickness;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BorderType;
import kr.dogfoot.hwplib.object.docinfo.borderfill.SlashDiagonalShape;
import kr.dogfoot.hwplib.object.docinfo.borderfill.fillinfo.*;
import kr.dogfoot.hwplib.object.docinfo.charshape.*;
import kr.dogfoot.hwplib.object.docinfo.parashape.Alignment;
import kr.dogfoot.hwplib.object.docinfo.parashape.LineSpaceSort;
import kr.dogfoot.hwplib.tool.blankfilemaker.BlankFileMaker;
import kr.dogfoot.hwplib.writer.HWPWriter;
import org.w3c.dom.*;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class ToHwp {
    private HWPFile hwp;
    private DocInfo di;
    private final Map<String, byte[]> files = new HashMap<>();
    private final Map<String, Integer> fontIdx = new HashMap<>();
    private final Map<String, Integer> csIdx = new HashMap<>();
    private final Map<String, Integer> csSize = new HashMap<>();
    private final Map<String, Integer> psIdx = new HashMap<>();
    private final Map<String, Integer> bfIdx = new HashMap<>();
    private final Map<String, String> binHref = new HashMap<>();
    private final Map<String, Integer> binIdx = new HashMap<>();
    private final List<String> notes = new ArrayList<>();
    private int zOrder = 0;
    private int baseCs = 0;

    /* ── 작은 도구 ── */
    private static String ln(Node n) { return n.getLocalName() != null ? n.getLocalName() : n.getNodeName().replaceAll("^.*:", ""); }
    private static List<Element> kids(Element e, String name) {
        List<Element> out = new ArrayList<>();
        if (e == null) return out;
        for (Node c = e.getFirstChild(); c != null; c = c.getNextSibling())
            if (c instanceof Element && (name == null || ln(c).equals(name))) out.add((Element) c);
        return out;
    }
    private static Element kid(Element e, String name) { List<Element> l = kids(e, name); return l.isEmpty() ? null : l.get(0); }
    private static List<Element> desc(Element e, String name) {
        List<Element> out = new ArrayList<>();
        if (e == null) return out;
        NodeList all = e.getElementsByTagNameNS("*", name);
        for (int i = 0; i < all.getLength(); i++) out.add((Element) all.item(i));
        return out;
    }
    private static String at(Element e, String n) { return e == null ? "" : e.getAttribute(n); }
    private static int num(Element e, String n, int d) { try { String v = at(e, n); return v.isEmpty() ? d : (int) Math.round(Double.parseDouble(v)); } catch (Exception x) { return d; } }
    /** #RRGGBB → 한글 색 값 (0x00BBGGRR) · 없으면 -1 */
    private static long color(String c) {
        if (c == null || !c.matches("#[0-9a-fA-F]{6}")) return -1;
        int r = Integer.parseInt(c.substring(1, 3), 16), g = Integer.parseInt(c.substring(3, 5), 16), b = Integer.parseInt(c.substring(5, 7), 16);
        return ((long) b << 16) | ((long) g << 8) | r;
    }
    private static Document parse(byte[] xml) throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setNamespaceAware(true);
        f.setExpandEntityReferences(false);
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        return f.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
    }

    public void convert(String in, String out) throws Exception {
        try (InputStream is = new FileInputStream(in); ZipInputStream z = new ZipInputStream(is)) {
            ZipEntry en;
            while ((en = z.getNextEntry()) != null) {
                if (en.isDirectory()) continue;
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                byte[] buf = new byte[65536];
                int n;
                while ((n = z.read(buf)) > 0) bo.write(buf, 0, n);
                files.put(en.getName(), bo.toByteArray());
            }
        }
        if (!files.containsKey("Contents/header.xml") || !files.containsKey("Contents/section0.xml")) throw new IllegalStateException("한글 문서(.hwpx)가 아니에요");
        Element head = parse(files.get("Contents/header.xml")).getDocumentElement();
        Element sec = parse(files.get("Contents/section0.xml")).getDocumentElement();
        if (files.containsKey("Contents/content.hpf")) {
            for (Element it : desc(parse(files.get("Contents/content.hpf")).getDocumentElement(), "item"))
                if (at(it, "href").contains("BinData/")) binHref.put(at(it, "id"), at(it, "href").replaceFirst("^/", ""));
        }

        hwp = BlankFileMaker.make();
        di = hwp.getDocInfo();
        baseCs = 0;
        readFonts(head);
        readBorderFills(head);
        readCharShapes(head);
        readParaShapes(head);

        Section section = hwp.getBodyText().getSectionList().get(0);
        Paragraph p0 = section.getParagraph(0);
        List<Element> ps = kids(sec, "p");
        // 구역 설정 (첫 문단의 secPr · 머리글 · 바닥글 · 쪽 번호)
        if (!ps.isEmpty()) setupSection(p0, ps.get(0));
        for (int i = 0; i < ps.size(); i++) {
            Paragraph p = i == 0 ? p0 : section.addNewParagraph();
            fillParagraph(p, ps.get(i));
        }
        // 각주 → 문서 끝에 번호 목록으로 (예전 한글 각주 개체 대신)
        if (!notes.isEmpty()) {
            for (int i = 0; i < notes.size(); i++) {
                Paragraph p = section.addNewParagraph();
                simpleParagraph(p, (i + 1) + ") " + notes.get(i), baseCs, 0);
            }
        }
        markLast(section.getParagraphs());
        HWPWriter.toFile(hwp, out);
    }

    /* ── 머리 (header.xml) ── */
    private void readFonts(Element head) {
        Element hangul = null;
        for (Element ff : desc(head, "fontface")) if ("HANGUL".equals(at(ff, "lang"))) hangul = ff;
        for (Element f : kids(hangul, "font")) fontIdx.put(at(f, "id"), addFace(at(f, "face")));
    }
    private int addFace(String name) {
        FaceName[] fns = { di.addNewHangulFaceName(), di.addNewEnglishFaceName(), di.addNewHanjaFaceName(), di.addNewJapaneseFaceName(), di.addNewEtcFaceName(), di.addNewSymbolFaceName(), di.addNewUserFaceName() };
        for (FaceName fn : fns) {
            fn.getProperty().setHasBaseFont(false);
            fn.getProperty().setHasFontInfo(false);
            fn.getProperty().setHasSubstituteFont(false);
            fn.setName(name == null || name.isEmpty() ? "맑은 고딕" : name);
        }
        return di.getHangulFaceNameList().size() - 1;
    }
    private void readBorderFills(Element head) {
        for (Element b : desc(head, "borderFill")) {
            Element lb = kid(b, "leftBorder");
            boolean line = lb != null && !"NONE".equals(at(lb, "type"));
            Element wb = desc(b, "winBrush").isEmpty() ? null : desc(b, "winBrush").get(0);
            long bg = wb == null ? -1 : color(at(wb, "faceColor"));
            bfIdx.put(at(b, "id"), addBorderFill(line, bg));
        }
    }
    private int addBorderFill(boolean line, long bg) {
        BorderFill bf = di.addNewBorderFill();
        bf.getProperty().set3DEffect(false);
        bf.getProperty().setShadowEffect(false);
        bf.getProperty().setSlashDiagonalShape(SlashDiagonalShape.None);
        bf.getProperty().setBackSlashDiagonalShape(BackSlashDiagonalShape.None);
        for (kr.dogfoot.hwplib.object.docinfo.borderfill.EachBorder eb : new kr.dogfoot.hwplib.object.docinfo.borderfill.EachBorder[]{ bf.getLeftBorder(), bf.getRightBorder(), bf.getTopBorder(), bf.getBottomBorder() }) {
            eb.setType(line ? BorderType.Solid : BorderType.None);
            eb.setThickness(BorderThickness.MM0_12);
            eb.getColor().setValue(0);
        }
        bf.getDiagonalBorder().setType(BorderType.None);
        bf.getDiagonalBorder().setThickness(BorderThickness.MM0_1);
        bf.getDiagonalBorder().getColor().setValue(0);
        bf.getFillInfo().getType().setPatternFill(true);
        bf.getFillInfo().createPatternFill();
        PatternFill pf = bf.getFillInfo().getPatternFill();
        pf.setPatternType(PatternType.None);
        pf.getBackColor().setValue(bg);
        pf.getPatternColor().setValue(0);
        return di.getBorderFillList().size();
    }
    private void readCharShapes(Element head) {
        boolean first = true;
        for (Element c : desc(head, "charPr")) {
            CharShape cs = di.addNewCharShape();
            Element fr = kid(c, "fontRef");
            Integer fi = fr == null ? null : fontIdx.get(at(fr, "hangul"));
            cs.getFaceNameIds().setForAll(fi == null ? 0 : fi);
            cs.getRatios().setForAll((short) 100);
            cs.getCharSpaces().setForAll((byte) 0);
            cs.getRelativeSizes().setForAll((short) 100);
            cs.getCharOffsets().setForAll((byte) 0);
            int size = num(c, "height", 1000);
            cs.setBaseSize(size);
            Element ul = kid(c, "underline"), so = kid(c, "strikeout");
            cs.getProperty().setItalic(kid(c, "italic") != null);
            cs.getProperty().setBold(kid(c, "bold") != null);
            cs.getProperty().setUnderLineSort(ul != null && !"NONE".equals(at(ul, "type")) ? UnderLineSort.Bottom : UnderLineSort.None);
            cs.getProperty().setUnderLineShape(BorderType2.Solid);
            cs.getProperty().setOutterLineSort(OutterLineSort.None);
            cs.getProperty().setShadowSort(ShadowSort.None);
            cs.getProperty().setEmboss(false);
            cs.getProperty().setEngrave(false);
            cs.getProperty().setSuperScript(kid(c, "supscript") != null);
            cs.getProperty().setSubScript(kid(c, "subscript") != null);
            cs.getProperty().setStrikeLine(so != null && !"NONE".equals(at(so, "shape")) && !at(so, "shape").isEmpty());
            cs.getProperty().setEmphasisSort(EmphasisSort.None);
            cs.getProperty().setUsingSpaceAppropriateForFont(false);
            cs.getProperty().setStrikeLineShape(BorderType2.Solid);
            cs.getProperty().setKerning(false);
            cs.setShadowGap1((byte) 0);
            cs.setShadowGap2((byte) 0);
            long tc = color(at(c, "textColor"));
            cs.getCharColor().setValue(tc < 0 ? 0 : tc);
            cs.getUnderLineColor().setValue(tc < 0 ? 0 : tc);
            cs.getShadeColor().setValue(color(at(c, "shadeColor")));
            cs.getShadowColor().setValue(0x00b2b2b2);
            cs.setBorderFillId(0);
            int idx = di.getCharShapeList().size() - 1;
            csIdx.put(at(c, "id"), idx);
            csSize.put(at(c, "id"), size);
            if (first) { baseCs = idx; first = false; }
        }
    }
    private void readParaShapes(Element head) {
        for (Element p : desc(head, "paraPr")) {
            ParaShape ps = di.addNewParaShape();
            String al = at(kid(p, "align"), "horizontal");
            ps.getProperty1().setValue(0);
            ps.getProperty1().setLineSpaceSort(LineSpaceSort.RatioForLetter);
            ps.getProperty1().setAlignment("CENTER".equals(al) ? Alignment.Center : "RIGHT".equals(al) ? Alignment.Right : "LEFT".equals(al) ? Alignment.Left : Alignment.Justify);
            Element bs = kid(p, "breakSetting");
            ps.getProperty1().setTogetherNextPara(bs != null && "1".equals(at(bs, "keepWithNext")));
            // 한글 줄 나눔 — OWPML KEEP_WORD = 글자 단위, BREAK_WORD = 어절 단위 (hwp2hwpx 와 같은 대응)
            ps.getProperty1().setLineDivideForHangul(bs != null && "KEEP_WORD".equals(at(bs, "breakNonLatinWord")) ? kr.dogfoot.hwplib.object.docinfo.parashape.LineDivideForHangul.ByLetter : kr.dogfoot.hwplib.object.docinfo.parashape.LineDivideForHangul.ByWord);
            // 여백은 HwpUnitChar(case) 쪽 값(HWPUNIT)을 읽어 두 배로 (한글 바이너리 단위)
            Element mg = desc(p, "margin").isEmpty() ? null : desc(p, "margin").get(0);
            int indent = 0, left = 0, right = 0, prev = 0, next = 0;
            if (mg != null) {
                for (Element m : kids(mg, null)) {
                    int v = num(m, "value", 0);
                    switch (ln(m)) {
                        case "intent": indent = v; break;
                        case "left": left = v; break;
                        case "right": right = v; break;
                        case "prev": prev = v; break;
                        case "next": next = v; break;
                    }
                }
            }
            ps.setLeftMargin(left * 2);
            ps.setRightMargin(right * 2);
            ps.setIndent(indent * 2);
            ps.setTopParaSpace(prev * 2);
            ps.setBottomParaSpace(next * 2);
            Element lsp = desc(p, "lineSpacing").isEmpty() ? null : desc(p, "lineSpacing").get(0);
            int line = num(lsp, "value", 160);
            ps.setLineSpace(line);
            ps.setLineSpace2(line);
            ps.setTabDefId(0);
            ps.setParaHeadId(0);
            ps.setBorderFillId(2);
            ps.setLeftBorderSpace((short) 0);
            ps.setRightBorderSpace((short) 0);
            ps.setTopBorderSpace((short) 0);
            ps.setBottomBorderSpace((short) 0);
            ps.getProperty2().setValue(0);
            ps.getProperty3().setValue(0);
            ps.setParaLevel(0);
            psIdx.put(at(p, "id"), di.getParaShapeList().size() - 1);
        }
    }

    /* ── 구역 (용지 · 여백 · 머리글 · 바닥글 · 쪽 번호) ── */
    private void setupSection(Paragraph p0, Element firstP) throws Exception {
        Element secPr = desc(firstP, "secPr").isEmpty() ? null : desc(firstP, "secPr").get(0);
        ControlSectionDefine sd = null;
        for (Control c : p0.getControlList()) if (c instanceof ControlSectionDefine) sd = (ControlSectionDefine) c;
        if (secPr != null && sd != null) {
            Element pp = kid(secPr, "pagePr");
            Element m = kid(pp, "margin");
            PageDef pd = sd.getPageDef();
            pd.setPaperWidth(num(pp, "width", 59528));
            pd.setPaperHeight(num(pp, "height", 84188));
            pd.getProperty().setPaperDirection("NARROWLY".equals(at(pp, "landscape")) ? PaperDirection.Landscape : PaperDirection.Portrait);
            if (m != null) {
                pd.setLeftMargin(num(m, "left", 8504));
                pd.setRightMargin(num(m, "right", 8504));
                pd.setTopMargin(num(m, "top", 5668));
                pd.setBottomMargin(num(m, "bottom", 4252));
                pd.setHeaderMargin(num(m, "header", 4252));
                pd.setFooterMargin(num(m, "footer", 4252));
                pd.setGutterMargin(0);
            }
        }
        long textW = 42520;
        if (sd != null) {
            PageDef pd = sd.getPageDef();
            boolean land = pd.getProperty().getPaperDirection() == PaperDirection.Landscape;
            textW = (land ? pd.getPaperHeight() : pd.getPaperWidth()) - pd.getLeftMargin() - pd.getRightMargin();
        }
        for (Element ctrl : desc(firstP, "ctrl")) {
            for (Element x : kids(ctrl, null)) {
                String n = ln(x);
                if (n.equals("header") || n.equals("footer")) {
                    ParaText pt = p0.getText();
                    ParagraphList list;
                    if (n.equals("header")) {
                        pt.addExtendCharForHeader();
                        ControlHeader h = (ControlHeader) p0.addNewControl(ControlType.Header);
                        h.getHeader().setCreateIndex(1);
                        h.getHeader().setApplyPage(HeaderFooterApplyPage.BothPage);
                        h.getListHeader().setTextWidth(textW);
                        h.getListHeader().setTextHeight(4252);
                        list = h.getParagraphList();
                        List<Element> ps = desc(x, "p");
                        h.getListHeader().setParaCount(Math.max(1, ps.size()));
                        for (Element p : ps) fillParagraph(list.addNewParagraph(), p);
                        if (ps.isEmpty()) simpleParagraph(list.addNewParagraph(), "", baseCs, 0);
                    } else {
                        pt.addExtendCharForFooter();
                        ControlFooter f = (ControlFooter) p0.addNewControl(ControlType.Footer);
                        f.getHeader().setCreateIndex(1);
                        f.getHeader().setApplyPage(HeaderFooterApplyPage.BothPage);
                        f.getListHeader().setTextWidth(textW);
                        f.getListHeader().setTextHeight(4252);
                        list = f.getParagraphList();
                        List<Element> ps = desc(x, "p");
                        f.getListHeader().setParaCount(Math.max(1, ps.size()));
                        for (Element p : ps) fillParagraph(list.addNewParagraph(), p);
                        if (ps.isEmpty()) simpleParagraph(list.addNewParagraph(), "", baseCs, 0);
                    }
                    markLast(list);
                } else if (n.equals("pageNum")) {
                    addExtend(p0.getText(), (short) 0x0015, "pgnp");
                    ControlPageNumberPosition pn = (ControlPageNumberPosition) p0.addNewControl(ControlType.PageNumberPosition);
                    String pos = at(x, "pos");
                    pn.getHeader().getProperty().setNumberShape(NumberShape.Number);
                    pn.getHeader().getProperty().setNumberPosition(pos.equals("BOTTOM_RIGHT") ? NumberPosition.RightBottom : pos.equals("TOP_RIGHT") ? NumberPosition.RightTop : pos.equals("TOP_CENTER") ? NumberPosition.CenterTop : NumberPosition.CenterBottom);
                    pn.getHeader().setNumber(1);
                    pn.getHeader().getUserSymbol().fromUTF16LEString("\u0000");
                    pn.getHeader().getBeforeDecorationLetter().fromUTF16LEString("\u0000");
                    pn.getHeader().getAfterDecorationLetter().fromUTF16LEString("\u0000");
                }
            }
        }
    }

    /** 확장 컨트롤 글자 — 문단 끝 표시(0x0d)는 늘 맨 뒤로 */
    private static void addExtend(ParaText pt, short code, String id) throws Exception {
        HWPCharControlExtend ch = pt.addNewExtendControlChar();
        ch.setCode(code);
        byte[] add = new byte[12];
        add[3] = (byte) id.charAt(0); add[2] = (byte) id.charAt(1); add[1] = (byte) id.charAt(2); add[0] = (byte) id.charAt(3);
        ch.setAddition(add);
        pt.addString("");
    }
    private static int textPos(ParaText pt) {
        int n = pt.getCharSize();
        return Math.max(0, n - 1); // 끝 표시(0x0d) 앞
    }

    /* ── 문단 ── */
    private void header(Paragraph p, Element pEl) {
        ParaHeader ph = p.getHeader();
        Integer ps = psIdx.get(at(pEl, "paraPrIDRef"));
        ph.setParaShapeId(ps == null ? 0 : ps);
        ph.setStyleId((short) 0);
        ph.getDivideSort().setDividePage("1".equals(at(pEl, "pageBreak")));
        ph.setInstanceID(0);
        ph.setIsMergedByTrack(0);
        ph.setLastInList(false);
    }
    private void simpleParagraph(Paragraph p, String text, int cs, int ps) throws Exception {
        p.getHeader().setParaShapeId(ps);
        p.getHeader().setStyleId((short) 0);
        p.getHeader().setLastInList(false);
        if (p.getText() == null) p.createText();
        p.getText().addString(text);
        if (p.getCharShape() == null) p.createCharShape();
        p.getCharShape().addParaCharShape(0, cs);
        lineSeg(p, 1000);
    }
    private void lineSeg(Paragraph p, int size) {
        if (p.getLineSeg() != null && !p.getLineSeg().getLineSegItemList().isEmpty()) return;
        if (p.getLineSeg() == null) p.createLineSeg();
        ParaLineSeg pls = p.getLineSeg();
        LineSegItem lsi = pls.addNewLineSegItem();
        lsi.setTextStartPosition(0);
        lsi.setLineVerticalPosition(0);
        lsi.setLineHeight(size);
        lsi.setTextPartHeight(size);
        lsi.setDistanceBaseLineToLineVerticalPosition((int) (size * 0.85));
        lsi.setLineSpace((int) (size * 0.6));
        lsi.setStartPositionFromColumn(0);
        lsi.setSegmentWidth(42520);
        lsi.getTag().setFirstSegmentAtLine(true);
        lsi.getTag().setLastSegmentAtLine(true);
    }
    private void fillParagraph(Paragraph p, Element pEl) throws Exception {
        header(p, pEl);
        if (p.getText() == null) p.createText();
        if (p.getCharShape() == null) p.createCharShape();
        ParaText pt = p.getText();
        ParaCharShape pcs = p.getCharShape();
        int lastCs = -1;
        int maxSize = 1000;
        boolean any = !pcs.getPositonShapeIdPairList().isEmpty();
        if (any) lastCs = (int) pcs.getPositonShapeIdPairList().get(pcs.getPositonShapeIdPairList().size() - 1).getShapeId();
        for (Element run : kids(pEl, "run")) {
            String rid = at(run, "charPrIDRef");
            Integer cs = csIdx.get(rid);
            int c = cs == null ? baseCs : cs;
            Integer sz = csSize.get(rid);
            if (sz != null) maxSize = Math.max(maxSize, sz);
            for (Element x : kids(run, null)) {
                String n = ln(x);
                if (n.equals("secPr") || n.equals("ctrl") && isSectionCtrl(x)) continue;
                int pos = textPos(pt);
                if (c != lastCs) {
                    if (!any && pos > 0) { pcs.addParaCharShape(0, c); any = true; }
                    pcs.addParaCharShape(any ? pos : 0, c);
                    any = true;
                    lastCs = c;
                }
                switch (n) {
                    case "t":
                        for (Node t = x.getFirstChild(); t != null; t = t.getNextSibling()) {
                            if (t.getNodeType() == Node.TEXT_NODE) pt.addString(t.getNodeValue());
                            else if (t instanceof Element) {
                                String tn = ln(t);
                                if (tn.equals("tab")) {
                                    HWPCharControlInline tab = pt.addNewInlineControlChar();
                                    tab.setCode((short) 0x0009);
                                    tab.setAddition(new byte[12]);
                                    pt.addString("");
                                } else if (tn.equals("lineBreak")) {
                                    HWPCharControlChar br = pt.addNewCharControlChar();
                                    br.setCode((short) 0x000a);
                                    pt.addString("");
                                } else if (tn.equals("fwSpace") || tn.equals("nbSpace")) pt.addString(" ");
                            }
                        }
                        break;
                    case "tbl": addTable(p, x); break;
                    case "pic": addPicture(p, x); break;
                    case "ctrl":
                        for (Element cx : kids(x, null)) {
                            String cn = ln(cx);
                            if (cn.equals("footNote") || cn.equals("endNote")) {
                                StringBuilder sb = new StringBuilder();
                                for (Element t : desc(cx, "t")) sb.append(t.getTextContent());
                                notes.add(sb.toString().trim());
                                pt.addString(sup(notes.size()));
                            } else if (cn.equals("autoNum") && "PAGE".equals(at(cx, "numType"))) {
                                addExtend(pt, (short) 0x0012, "atno");
                                ControlAutoNumber an = (ControlAutoNumber) p.addNewControl(ControlType.AutoNumber);
                                an.getHeader().getProperty().setNumberSort(NumberSort.Page);
                                an.getHeader().getProperty().setNumberShape(NumberShape.Number);
                                an.getHeader().getProperty().setSuperScript(false);
                                an.getHeader().setNumber(1);
                                an.getHeader().getUserSymbol().fromUTF16LEString("\u0000");
                                an.getHeader().getBeforeDecorationLetter().fromUTF16LEString("\u0000");
                                an.getHeader().getAfterDecorationLetter().fromUTF16LEString("\u0000");
                            }
                        }
                        break;
                    default: break;
                }
            }
        }
        if (pt.getCharList().isEmpty()) pt.addString("");
        if (!any) pcs.addParaCharShape(0, baseCs);
        lineSeg(p, maxSize);
    }
    private static boolean isSectionCtrl(Element ctrl) {
        for (Element k : kids(ctrl, null)) { String n = ln(k); if (n.equals("colPr") || n.equals("header") || n.equals("footer") || n.equals("pageNum")) return true; }
        return false;
    }
    private static String sup(int n) {
        String d = "⁰¹²³⁴⁵⁶⁷⁸⁹", s = String.valueOf(n);
        StringBuilder b = new StringBuilder();
        for (char ch : s.toCharArray()) b.append(d.charAt(ch - '0'));
        return b.toString();
    }
    private static void markLast(ParagraphList list) {
        int n = 0;
        for (Paragraph p : list) n++;
        int i = 0;
        for (Paragraph p : list) { p.getHeader().setLastInList(++i == n); }
    }
    private static void markLast(Paragraph[] arr) {
        if (arr == null) return;
        for (int i = 0; i < arr.length; i++) arr[i].getHeader().setLastInList(i == arr.length - 1);
    }

    /* ── 표 ── */
    private void gsoHeader(CtrlHeaderGso h, int w, int hgt, ObjectNumberSort sort) {
        GsoHeaderProperty prop = h.getProperty();
        prop.setLikeWord(true); // 글자처럼 취급
        prop.setApplyLineSpace(false);
        prop.setVertRelTo(VertRelTo.Para);
        prop.setVertRelativeArrange(RelativeArrange.TopOrLeft);
        prop.setHorzRelTo(HorzRelTo.Para);
        prop.setHorzRelativeArrange(RelativeArrange.TopOrLeft);
        prop.setVertRelToParaLimit(true);
        prop.setAllowOverlap(false);
        prop.setWidthCriterion(WidthCriterion.Absolute);
        prop.setHeightCriterion(HeightCriterion.Absolute);
        prop.setProtectSize(false);
        prop.setTextFlowMethod(TextFlowMethod.TakePlace);
        prop.setTextHorzArrange(TextHorzArrange.BothSides);
        prop.setObjectNumberSort(sort);
        h.setxOffset(0);
        h.setyOffset(0);
        h.setWidth(Math.max(1, w));
        h.setHeight(Math.max(1, hgt));
        h.setzOrder(zOrder++);
        h.setOutterMarginLeft(sort == ObjectNumberSort.Table ? 283 : 0);
        h.setOutterMarginRight(sort == ObjectNumberSort.Table ? 283 : 0);
        h.setOutterMarginTop(sort == ObjectNumberSort.Table ? 283 : 0);
        h.setOutterMarginBottom(sort == ObjectNumberSort.Table ? 283 : 0);
        h.setInstanceId(0x7a000000 + zOrder);
        h.setPreventPageDivide(false);
        h.getExplanation().setBytes(null);
    }
    private void addTable(Paragraph p, Element tbl) throws Exception {
        p.getText().addExtendCharForTable();
        ControlTable t = (ControlTable) p.addNewControl(ControlType.Table);
        Element sz = kid(tbl, "sz");
        int rows = num(tbl, "rowCnt", 1), cols = num(tbl, "colCnt", 1);
        gsoHeader(t.getHeader(), num(sz, "width", 40000), num(sz, "height", 1800 * rows), ObjectNumberSort.Table);
        Table tr = t.getTable();
        tr.getProperty().setDivideAtPageBoundary(DivideAtPageBoundary.DivideByCell);
        tr.getProperty().setAutoRepeatTitleRow("1".equals(at(tbl, "repeatHeader")));
        tr.setRowCount(rows);
        tr.setColumnCount(cols);
        tr.setCellSpacing(0);
        Element im = kid(tbl, "inMargin");
        tr.setLeftInnerMargin(num(im, "left", 510));
        tr.setRightInnerMargin(num(im, "right", 510));
        tr.setTopInnerMargin(num(im, "top", 141));
        tr.setBottomInnerMargin(num(im, "bottom", 141));
        Integer tbf = bfIdx.get(at(tbl, "borderFillIDRef"));
        tr.setBorderFillId(tbf == null ? 1 : tbf);
        for (Element trEl : kids(tbl, "tr")) {
            List<Element> tcs = kids(trEl, "tc");
            tr.getCellCountOfRowList().add(tcs.size());
            Row row = t.addNewRow();
            for (Element tc : tcs) {
                Cell cell = row.addNewCell();
                Element addr = kid(tc, "cellAddr"), span = kid(tc, "cellSpan"), csz = kid(tc, "cellSz"), cm = kid(tc, "cellMargin"), sub = kid(tc, "subList");
                List<Element> ps = kids(sub, "p");
                ListHeaderForCell lh = cell.getListHeader();
                lh.setParaCount(Math.max(1, ps.size()));
                lh.getProperty().setTextDirection(TextDirection.Horizontal);
                lh.getProperty().setLineChange(LineChange.Normal);
                String va = at(sub, "vertAlign");
                lh.getProperty().setTextVerticalAlignment("TOP".equals(va) ? TextVerticalAlignment.Top : "BOTTOM".equals(va) ? TextVerticalAlignment.Bottom : TextVerticalAlignment.Center);
                lh.getProperty().setProtectCell(false);
                lh.getProperty().setEditableAtFormMode(false);
                lh.setColIndex(num(addr, "colAddr", 0));
                lh.setRowIndex(num(addr, "rowAddr", 0));
                lh.setColSpan(num(span, "colSpan", 1));
                lh.setRowSpan(num(span, "rowSpan", 1));
                int w = num(csz, "width", 8000);
                lh.setWidth(w);
                lh.setHeight(num(csz, "height", 1800));
                lh.setLeftMargin(num(cm, "left", 510));
                lh.setRightMargin(num(cm, "right", 510));
                lh.setTopMargin(num(cm, "top", 141));
                lh.setBottomMargin(num(cm, "bottom", 141));
                Integer bf = bfIdx.get(at(tc, "borderFillIDRef"));
                lh.setBorderFillId(bf == null ? 1 : bf);
                lh.setTextWidth(Math.max(1, w - num(cm, "left", 510) - num(cm, "right", 510)));
                lh.setFieldName("");
                ParagraphList list = cell.getParagraphList();
                for (Element pe : ps) fillParagraph(list.addNewParagraph(), pe);
                if (ps.isEmpty()) simpleParagraph(list.addNewParagraph(), "", baseCs, 0);
                markLast(list);
            }
        }
    }

    /* ── 그림 (그림을 채운 네모, 글자처럼 취급) ── */
    private void addPicture(Paragraph p, Element pic) throws Exception {
        Element img = desc(pic, "img").isEmpty() ? null : desc(pic, "img").get(0);
        String ref = at(img, "binaryItemIDRef");
        Integer bin = binIdx.get(ref);
        if (bin == null) {
            String href = binHref.get(ref);
            byte[] data = href == null ? null : files.get(href);
            if (data == null) return;
            String ext = href.replaceAll("^.*\\.", "").toLowerCase();
            int stream = hwp.getBinData().getEmbeddedBinaryDataList().size() + 1;
            hwp.getBinData().addNewEmbeddedBinaryData("Bin" + String.format("%04X", stream) + "." + ext, data, BinDataCompress.ByStorageDefault);
            BinData bd = new BinData();
            bd.getProperty().setType(BinDataType.Embedding);
            bd.getProperty().setCompress(BinDataCompress.ByStorageDefault);
            bd.getProperty().setState(BinDataState.NotAccess);
            bd.setBinDataID(stream);
            bd.setExtensionForEmbedding(ext);
            di.getBinDataList().add(bd);
            bin = di.getBinDataList().size();
            binIdx.put(ref, bin);
        }
        Element cur = kid(pic, "curSz");
        int w = num(cur, "width", 14400), h = num(cur, "height", 10800);
        p.getText().addExtendCharForGSO();
        ControlRectangle rect = (ControlRectangle) p.addNewGsoControl(GsoControlType.Rectangle);
        gsoHeader(rect.getHeader(), w, h, ObjectNumberSort.Figure);
        ShapeComponentNormal sc = (ShapeComponentNormal) rect.getShapeComponent();
        sc.getProperty().setRotateWithImage(true);
        sc.setOffsetX(0);
        sc.setOffsetY(0);
        sc.setGroupingCount(0);
        sc.setLocalFileVersion(1);
        sc.setWidthAtCreate(w);
        sc.setHeightAtCreate(h);
        sc.setWidthAtCurrent(w);
        sc.setHeightAtCurrent(h);
        sc.setRotateAngle(0);
        sc.setRotateXCenter(w / 2);
        sc.setRotateYCenter(h / 2);
        sc.createLineInfo();
        LineInfo li = sc.getLineInfo();
        li.getProperty().setLineEndShape(LineEndShape.Flat);
        li.getProperty().setStartArrowShape(LineArrowShape.None);
        li.getProperty().setStartArrowSize(LineArrowSize.MiddleMiddle);
        li.getProperty().setEndArrowShape(LineArrowShape.None);
        li.getProperty().setEndArrowSize(LineArrowSize.MiddleMiddle);
        li.getProperty().setFillStartArrow(true);
        li.getProperty().setFillEndArrow(true);
        li.getProperty().setLineType(LineType.None);
        li.setOutlineStyle(OutlineStyle.Normal);
        li.setThickness(0);
        li.getColor().setValue(0);
        sc.createFillInfo();
        FillInfo fi = sc.getFillInfo();
        fi.getType().setPatternFill(false);
        fi.getType().setImageFill(true);
        fi.getType().setGradientFill(false);
        fi.createImageFill();
        ImageFill imgF = fi.getImageFill();
        imgF.setImageFillType(ImageFillType.FitSize);
        imgF.getPictureInfo().setBrightness((byte) 0);
        imgF.getPictureInfo().setContrast((byte) 0);
        imgF.getPictureInfo().setEffect(PictureEffect.RealPicture);
        imgF.getPictureInfo().setBinItemID(bin);
        sc.createShadowInfo();
        ShadowInfo si = sc.getShadowInfo();
        si.setType(ShadowType.None);
        si.getColor().setValue(0xc4c4c4);
        si.setOffsetX(283);
        si.setOffsetY(283);
        si.setTransparent((short) 0);
        sc.setMatrixsNormal();
        ShapeComponentRectangle scr = rect.getShapeComponentRectangle();
        scr.setRoundRate((byte) 0);
        scr.setX1(0); scr.setY1(0);
        scr.setX2(w); scr.setY2(0);
        scr.setX3(w); scr.setY3(h);
        scr.setX4(0); scr.setY4(h);
    }
}
