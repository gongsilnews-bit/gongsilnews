import React from "react";

export default function AdminManual() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'row', gap: 24, padding: 24, background: '#f8fafc', alignItems: 'flex-start' }}>
      <style>{`
        .manual-section { margin-bottom: 64px; }
        .pages-header { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
        .pages-group { margin-bottom: 24px; line-height: 1.6; color: #334155; font-size: 15px; }
        .pages-titles { font-size: 18px; font-weight: 700; color: #0284c7; margin-bottom: 12px; }
        .pages-titles .badge { background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 14px; margin-right: 8px; }
        .pages-titles .badge.dark { background: #334155; }
        .figure { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #f8fafc; text-align: center; }
        .figure img { max-width: 100%; border-radius: 4px; }
        .kbd { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 0 4px; }
        .admin-sidebar-nav { position: sticky; top: 24px; width: 240px; min-width: 240px; background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; height: calc(100vh - 48px); overflow-y: auto; }
        .admin-sidebar-nav ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; }
        .admin-sidebar-nav li { width: 50%; }
        .admin-sidebar-nav li.menu-text { width: 100%; font-weight: 700; color: #1e293b; margin-top: 16px; margin-bottom: 8px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;}
        .admin-sidebar-nav li a { color: #64748b; text-decoration: none; display: block; padding: 4px 0; font-size: 14px; transition: color 0.2s; }
        .admin-sidebar-nav li a:hover { color: #0284c7; font-weight: 600; }
        .under-line { text-decoration: underline; }
        .text-primary { color: #0284c7; }
        .admin-point, .color-point { color: #e11d48; }
        .button { background: #fff; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 4px; font-size: 13px; cursor: pointer; color: #475569; display: inline-flex; align-items: center; justify-content: center; margin-top: 8px; }
        .button:hover { background: #f1f5f9; }
        .reveal { display: none; }
      `}</style>
      
      {/* 본문 영역 */}
      <div style={{ flex: 1, minWidth: 0, background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div id="admin-content" className="manual">

	<div className="sections">

		<div className="clearfix">
							<img src="/manual/2.0/image/manual_header.jpg" alt="FINE SE v11 admin dashboard manual" />
					</div>

		
<section id="dashboard1" className="manual-section">
	<header className="pages-header">대시보드</header>
	<section className="pages-content">
		
		<figure className="figure">
			<img src="/manual/2.0/image/dashboard01.png" alt="dashboard page" />
		</figure>
		

		
		<article className="pages-group">
			<p>
				현재 기사들의 상태와 각종통계 및 회원관련 사항을 요약한 페이지입니다.<br />
				최근삭제된기사 메뉴를 통해 통해 삭제된 기사를 복원하실 수도 있습니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write1" className="manual-section">
	<header className="pages-header">기사등록</header>
	<section className="pages-content">
		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write01.png" alt="기사등록화면" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>기사등급</strong></div>
			<p>
				메인화면에 배치되는 영역에 영향을 주는 옵션입니다.<br />
				일반기사 (하단) / 중요기사 (중간) / 헤드라인 (상단) 각 영역에 배치됩니다.
			</p>
			
			<button type="button" className="button hollow small" data-open="toggler1"><i className="icon-info-o"></i>&nbsp;메인화면 배치되는 위치 보기</button>
			<div className="reveal small gray" id="toggler1" data-reveal>
				<header className="reveal-header">
					<div className="reveal-title">메인화면 배치되는 위치</div>
					<div className="reveal-msg">
						본 이미지는 고객 이해를 돕기위한 참고용이며,<br />
						각 영역별 기사의 모양이나 개수 등은 조정 가능합니다
					</div>
				</header>
				<section className="reveal-container text-center">
					<img src="/manual/2.0/image/main_sample.png" alt="위치예시" />
				</section>
				
				<button className="close-button" data-close aria-label="Close modal" type="button">
					<i className="icon-close-thin"><span className="show-for-sr">닫기</span></i>
				</button>
			</div>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>상태</strong></div>
			<p>
				- 미승인 : 편집장 승인전 까지 네티즌에게 공개되지 않는 기사<br />
				- 승인 : 네티즌에게 바로 공개할 기사 (기사 작성 후 웹출판 메뉴 클릭시 메인화면에 반영)<br />
				- 반려 : 기사 작성자에게 기사수정이나 내용보강 요청 등의 필요가 있을 경우 사용
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><strong className="key-point admin-point">추가옵션 열기</strong></div>
			<p>
				기사입력시 자주 사용하지 않는 옵션은 이용자편의를 위해 가려놓은 상태입니다.<br />
				만약, 이 추가옵션 내에 자주 사용하는 메뉴가 있다면 저희측에 요청해 주시면 상시노출 영역으로 배치해 드립니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>형태</strong></div>
			<p>
				일반 : 글, 사진으로 이루어진 대부분의 기사<br />
				카드뉴스 : 카드뉴스형 기사 작성시 사용.<br />
				갤러리 : 사진위주의 기사 작성시 사용.
			</p>

			<button type="button" className="button secondary hollow small" data-open="sample1"><i className="icon-info-o"></i>&nbsp;적용화면보기</button>	
			<div className="reveal small gray" id="sample1" data-reveal>
				<header className="reveal-header">
					<div className="reveal-title">적용화면</div>
				</header>
				<section className="reveal-container text-center">
					<img src="/manual/2.0/image/article-type-sample.png" alt="형태 적용예시" />
				</section>
				
				<button className="close-button" data-close aria-label="Close modal" type="button">
					<i className="icon-close-thin"><span className="show-for-sr">닫기</span></i>
				</button>
			</div>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">4</span> <strong>노출시간</strong></div>
			<p>
				예약 설정 기사를 작성할 경우에 사용하며, 작성자가 지정한 미래의 날짜와 시간 이후에 노출됩니다.<br />
				※예약 시간 설정 이후 반드시 웹출판이 1회 이상 실행 되어야 메인화면에 정상적으로 반영됩니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">5</span> <strong>섹션</strong></div>
			<p>
				기사 내용의 분류에 맞는 섹션을 선택합니다.<br />
				1차/2차/연재 섹션은 관리자모드의 환경설정 &gt; 기사설정 &gt; 섹션설정에서 직접 컨트롤이 가능합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">6</span> <strong>기자명(이메일)</strong></div>
			<p>
				기자명은 직접 입력하실 필요없이 예시 이미지처럼 기자명 필드를 선택 후 나오는 기자명을 클릭하시면 자동으로 삽입 됩니다.<br />
				회원수정 메뉴에서 회원등급을 시민기자/기자/데스크 중 하나로 지정하시면 이름이 추가됩니다.
			</p>
			<a href="#member1" target="_blank" className="button secondary small"><i className="icon-external-link"></i>&nbsp;기자명 등록하는 방법</a>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">7</span> <strong>부제목</strong></div>
			<p>
				부제목의 경우 엔터<span className="kbd">Enter</span>키를 이용하여 여러줄을 넣을 수 있습니다.
			</p>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">8</span> <strong>본문 맞춤보기설정</strong></div>
			<p>
				본문 에디터(쓰기)화면이 실제 적용될 기사화면과 크기가 상이하여 불편함이 있는 경우,<br />
				본문크기를 선택하시면 사용자화면과 동일 크기로 보여집니다. 
			</p>
		</article>
		

	</section>
</section>

<section id="write2" className="manual-section">
	<header className="pages-header">글쓰기</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write02.png" alt="글쓰기" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>텍스트로 붙여넣기</strong></div>
			<p>
				보도자료와 같은 외부원고 (HWP, MS워드)를 복사하여 붙여넣는 경우라면 반드시 <u className="text-primary">텍스트로 붙여넣기</u>를 이용해 주세요.<br />
				불필요한 html태그가 기사에 포함되는 것을 방지하기 위한 기능입니다.<br />
				습관적으로 사용하는 <span className="kbd">Ctrl+V</span> 또는 <span className="kbd">마우스 우클릭</span> 후 붙여넣기하지 마시고,<br />
				반드시 <u className="text-primary">텍스트로 붙여넣기</u> 버튼을 이용해 주시기 바랍니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>키워드</strong></div>
			<p>
				태그의 역할을 하는 것으로, 단어만 입력 후 <span className="kbd">,</span>(콤마) 또는 <span className="kbd">Enter</span>(줄바꿈)키 입력시 한 단어씩 분리되어 삽입됩니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>관련기사</strong></div>
			<p>
				현재 작성중인 기사와 관련있는 과거의 기사들을 검색하여 기사 본문 하단에 추가해 줄 수 있습니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write3" className="manual-section">
	<header className="pages-header">사진추가</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write03.png" alt="사진추가 첫단계" />
		</figure>
		

		
		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>위치지정</strong></div>
			<p>
				먼저 사진을 넣고자하는 문단의 제일 앞쪽에 커서를 위치시킵니다. (문단의 제일 앞에 마우스 클릭)
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>사진버튼</strong></div>
			<p>
				별도의 옵션설정이 필요한 경우, 좌측의 <span className="label tiny">사진</span>버튼을 선택<br />
				빠른설정을 원하시는 경우, 우측의 라이브러리에서 드래그앤드롭(끌어서 넣기) 또는 퀵버튼을 선택하시면 사진이 업로드됩니다.
			</p>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">3</span> <strong>상세옵션</strong></div>
			<p>
				업로드된 이미지에 마우스를 지정(Over)하면 상세패널이 활성화 되며,<br />
				<i className="icon-wrench"></i>(수정)버튼을 선택하면 상세옵션을 지정할 수 있습니다. 
			</p>
		</article>
		



		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write04.png" alt="사진추가" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">a</span> <strong>선택</strong></div>
			<p>
				파일선택시 컨트롤<span className="kbd">Ctrl</span> 또는 쉬프트<span className="kbd">Shift</span> 키를 누른 상태에서 여러파일을 클릭하여 사진을 한번에 업로드 할 수 있습니다. (멀티업로드 지원)
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">b</span> <strong>기준크기</strong></div>
			<p>
				일반적인 원본 이미지의 경우 3,000~4,000px 정도의 큰 사이즈라 웹서비스에는 적합치 않습니다.<br />
				기준크기는 기사에 입력되는 사진을 자동으로 리사이징 해주는 기능입니다.<br />
				참고로 180px과 250px는 증명사진과 같은 세로형 인물이미지 권장사이즈 입니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">c</span> <strong>삽입방식</strong></div>
			<p>
				자동을 선택하시면 확인 버튼을 클릭함과 동시에 본문에 삽입됩니다.<br />
                            수동을 선택하시면 본문에 바로 삽입되지 않고 화면 우측에 대기 상태로 등록되며,<br />
                            이 사진은 추후 언제든 원하시는 위치에 삽입할 수 있습니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">d</span> <strong>삽입위치</strong></div>
			<p>
				 기사 본문의 좌측/중앙/우측 중 어느쪽으로 배치할 것인지 결정합니다.<br />
				 특별한 경우가 아니면 중앙 정렬이 기본입니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">e</span> <strong>워터마크</strong></div>
			<p>
				 사진에 회사의 제호(로고 이미지) 위치를 지정하여 추가할 수 있습니다.
			</p>

			<button type="button" className="button secondary hollow small" data-open="toggler2"><i className="icon-info-o"></i>&nbsp;워터마크 옵션별 위치보기</button>
			<div className="reveal small gray" id="toggler2" data-reveal>
				<header className="reveal-header">
					<div className="reveal-title">워터마크 옵션별 위치</div>
				</header>
				<section className="reveal-container text-center">
					<img src="/manual/2.0/image/water-mark.png" alt="워터마크 위치예시" />
				</section>
				
				<button className="close-button" data-close aria-label="Close modal" type="button">
					<i className="icon-close-thin"><span className="show-for-sr">닫기</span></i>
				</button>
			</div>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">f</span> <strong>설명(캡션)</strong></div>
			<p>
				  사진의 바로 아래에 추가되는 사진의 설명글을 넣어줍니다.<br />
				  일단 사진을 삽입한 후에 기사본문에서 직접 사진설명을 수정하는 것도 가능합니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write4" className="manual-section">
	<header className="pages-header">동영상추가</header>
	<section className="pages-content">
		
		
		<article className="pages-group">
           <p>
                    동영상 서비스를 위해서는 언론사에서 별도의 영상 서버 공간을 마련해야 하며 비용이 발생하게 되므로,
                    대부분의 언론사는 별도의 영상 서버를 구축하지 않고 유튜브와 같이 오픈된 영상 플랫폼을 통해서 동영상을 관리합니다.
           </p>
                    
           <p>여기에서는 무료 서비스인 유튜브를 활용해서 동영상을 기사에 삽입하는 방법에 관해 설명합니다.</p>
                    
           <p>먼저, 유튜브에 무료 회원가입을 한 후 동영상을 업로드합니다.</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/mov_copy1.jpg" alt="유튜브 URL 복사" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>URL 복사</strong></div>
			<p>
				업로드된 동영상 위에서 마우스 우측키를 클릭하여 나타나는 단축메뉴 중 <span className="label tiny">동영상 URL복사</span> 를 선택합니다.
			</p>

			<button type="button" className="button secondary hollow small" data-open="toggler3"><i className="icon-info-o"></i>&nbsp;소스코드로 복사 하는 방법</button>
			<div className="reveal small gray" id="toggler3" data-reveal>
				<header className="reveal-header">
					<div className="reveal-title">소스코드복사 하는 다른 방법</div>
				</header>
				<section className="reveal-container text-center">
					<img src="/manual/2.0/image/mov_copy2.jpg" alt="유튜브 소스코드 복사2" />
					<div className="help-text admin-point martop-15">※ 소스코드의 경우 글쓰기도구 - 영상에서 등록가능합니다.</div>
				</section>
				
				<button className="close-button" data-close aria-label="Close modal" type="button">
					<i className="icon-close-thin"><span className="show-for-sr">닫기</span></i>
				</button>
			</div>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write05-1.png" alt="동영상추가" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>위치지정</strong></div>
			<p>
				기사입력화면에서 영상을 넣고자하는 위치를 마우스로 클릭하여 지정합니다.<br />
				이 과정은 사진넣기 할 때와 방법이 동일합니다.<br />
				(해당문단의 제일 앞쪽에 마우스를 클릭.)
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>동영상 URL 붙여넣기</strong></div>
			<p>
				기사입력화면 우측에서 영상버튼을 클릭한 후 동영상태그 박스에 ①에서 복사한 동영상URL를 붙여넣기<span className="kbd">Ctrl+V</span> 합니다.
			</p>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">4</span> <strong>상세옵션</strong></div>
			<p>
				업로드된 이미지에 마우스를 지정(Over)하면 상세패널이 활성화 됩니다.<br />
				<i className="icon-wrench"></i>(수정)버튼을 선택하여 상세옵션을 지정할 수 있습니다. 
			</p>
		</article>
		
		
		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write05-2.png" alt="동영상 상세추가" />
		</figure>
		
		
		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">a</span> <strong>영상URL/태그</strong></div>
			<p>
				유튜브 영상의 경우 URL주소로 등록이 가능하며, 타사이트 영상(네이버,다음,페이스북 등)은 소스코드로 등록 가능합니다. 
			</p>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">b</span> <strong> 캡션</strong></div>
			<p>
				동영상의 설명글이 필요한 경우, 내용을 기재하여 주시면 동영상 아래에 사진설명과 같이 노출됩니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write5" className="manual-section">
	<header className="pages-header">파일추가</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write06.png" alt="파일추가" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>위치지정</strong></div>
			<p>
				기사입력화면에서 파일을 첨부 하고자는 위치를 마우스로 클릭하여 지정합니다.<br />
				이 과정은 사진넣기 할 때와 방법이 동일합니다.<br />
				(해당문단의 제일 앞쪽에 마우스롤 클릭.)
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>파일첨부</strong></div>
			<p>
				필요에 따라 사진이나 영상이 아닌 파일을 첨부하여 이용자가 다운로드 받아 볼 수 있게 할 수 있습니다.<br />
				첨부할 수 있는 파일포맷은 zip, alz, xls, doc, ppt, hwp, pdf, txt 입니다. 
			</p>
		</article>
		

	</section>
</section>

<section id="write11" className="manual-section">
	<header className="pages-header">미디어N</header>
	<section className="pages-content">
		
		<article className="pages-group">
			<p className="mar-top">
				미디어N은 엔디소프트에서 선정한 양질의 컨텐츠 공급사 기사를 무료로 이용할 수 있는 서비스 입니다.
			</p>

			<p className="mar-top">
				<strong className="color-dark under-line">※ 미디어N 이용 시 주의 사항</strong>
			</p>

			<p className="mar-top">
				미디어N을 통해 제공되는 컨텐츠는 공급사별 각각의 정책으로 운영되고 있습니다.<br />
				이용전 각 약관을 참고하시어 이용 바랍니다.
			</p>
			
		</article>

		

		
		<figure className="figure">
			<img src="/manual/2.0/image/median1.png" alt="미디어N 예시1" />
		</figure>
		


	</section>
</section>

<section id="write7" className="manual-section">
	<header className="pages-header">포토DB</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write08.png" alt="관련사진불러오기" />
		</figure>
		

		
		<article className="pages-group">
			<p>
				과거 다른 기사에 입력되어 있던 사진을 불러와 재활용할 수 있습니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write13" className="manual-section">
	<header className="pages-header">임시보관함</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write17.png" alt="임시보관함" />
		</figure>
		

		
		<article className="pages-group">
			<p>
				기사 작성 중 정상적으로 완료되지 않은 기사는 일정간격으로 임시저장되며,<br />
				보관된 기사를 불러와 재수정 할 수 있습니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write8" className="manual-section">
	<header className="pages-header">템플릿</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write09.png" alt="템플릿" />
		</figure>
		

		
		<article className="pages-group">
			<p>
				기사 본문 편집시 미리 설정된 다양한 형태의 템플릿을 활용하여 예쁘게 꾸며 보세요.
			</p>
		</article>
		

	</section>
</section>

<section id="write9" className="manual-section">
	<header className="pages-header">특수기호</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write10.png" alt="특수기호" />
		</figure>
		

		
		<article className="pages-group">
			<p>
				기사 작성시 자주 사용되는 특수기호(아스키코드)를 쉽게 넣을 수 있습니다.<br />
				더블클릭하시면 본문 마우스 포인터가 위치한 곳에 삽입됩니다.
			</p>
		</article>
		

	</section>
</section>

<section id="write12" className="manual-section">
	<header className="pages-header">승인관리</header>
	<section className="pages-content">
		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write14.png" alt="개별승인" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>예약기사</strong></div>
			<p>
				녹색배경의 기사는 예약설정이 된 기사입니다.
			</p>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>미승인기사</strong></div>
			<p>
				파란배경의 기사는 미승인 기사입니다.
			</p>
		</article>
		
		
		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>등급</strong></div>
			<p>
				<u className="text-primary">미승인, 일반기사, 중요기사, 헤드라인</u> 등급을 개별 선택하여 승인할 수 있습니다.
			</p>
		</article>
		
		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">5</span> <strong>개별승인</strong></div>
			<p>
				원하는 기사만 개별승인/취소가 가능합니다.<br />
				승인시 포털이 선택되어 있다면 자동으로 전송되며, 취소시는 포털에 삭제전송 명령이 동시에 실행됩니다.
			</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-write15.png" alt="일괄승인" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">6</span><span className="badge">7</span> <strong>선택승인</strong></div>
			<p>
				개별적으로 기사를 승인하지 않고, 선택된 기사를 일괄로 승인/전송할 수 있습니다.<br />
				포털전송의 경우 미리 선택된 경우에 한함니다.
			</p>
		</article>
		


	</section>
</section>

<section id="edit1" className="manual-section">
	<header className="pages-header">구성의 이해</header>
	<section className="pages-content">
		
		<article className="pages-group">
			<p>
				메인화면 기사 배치의 경우, 최근에는 사용이 편리한 자동박스 형태로 대부분 작업이 이뤄집니다.<br />
				부득이하게 수동편집이 필요한 경우, 별도로 문의해주시면 상세히 설명해드리겠습니다. 
			</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-edit01.png" alt="구성의 이해" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><strong>컨텐츠 색상별 이해</strong></div>
			<p>
				- 노란색 : HTML로 구성된 항목 (네트워크 배너, 탭박스 등)<br />
				- 회색 : 자동박스 또는 박스로 구성된 항목<br /> 
				- 녹색 : 배너로 구성된 항목
			</p>
			
		</article>
		
	</section>
</section>

<section id="edit2" className="manual-section">
	<header className="pages-header">박스/배너 이동</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-edit02.png" alt="박스/배너 이동" />
			<figcaption>박스/배너 이동</figcaption>
		</figure>
		

		
		<article className="pages-group">
			<p>
				 컨텐츠 박스 위 배경에 마우스를 위치시키면 <strong className="under-line">마우스 포인터가 "이동"표시 아이콘으로 변경</strong>됩니다.<br />
				클릭 후 끌어서 놓기 이동(드래그 앤 드롭)하시면 박스가 움직입니다.
			</p>
			
		</article>

	</section>
</section>

<section id="edit3" className="manual-section">
	<header className="pages-header">메인 노출기사 편집</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-edit03.png" alt="버튼" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><strong>"수정"버튼 위치</strong></div>
			<p>
				박스(회색)에서 아래 화살표를 클릭하면 기사 패널이 펼침상태로 변경 되며,<br />
				기사패널 아이콘 중 수정 을 클릭하여 옵션을 지정할 수 있습니다.
			</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-edit04.png" alt="편집" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>버튼 기능설명</strong></div>
			<p>
				<span className="admin-point"><strong>고정 :</strong> 기사를 고정값으로 변경 후에 기사의 상세내용을 편집할 수 있습니다. 변경후에는 자동 기사갱신이 해제됩니다.</span><br />
				<strong className="blue">교체 :</strong> 기사입력 창을 추가하여 기사를 불러오는 기능입니다.<br />
				<strong className="blue">상세 :</strong> 이미지편집/추가, 부제목, 동영상태그, 내용요약등을 변경 입력할 수 있는 기능입니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>기존사진 편집</strong></div>
			<p>
				기사에 등록된 이미지를 불러와 원하는 부분만 잘라내어 썸네일 이미지로 사용할 수 있습니다. (사진편집 참조)
			</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/article-edit07.png" alt="이동" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><strong>기사 위치이동</strong></div>
			<p>
				마우스 끌어서 (드래그 앤 드롭) 위아래로 이동시키면 기사의 순서가 변경됩니다.
			</p>
		</article>
		


	</section>
</section>

<section id="member1" className="manual-section">
	<header className="pages-header">회원관리</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/member1.png" alt="회원목록" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>회원 간략정보</strong></div>
			<p>
				회원목록 첫 화면에서 각 회원들의 요약정보를 볼 수 있으며,<br />
				수정/삭제등의 관리가 가능합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>회원검색</strong></div>
			<p>
				다양한 옵션을 설정하여 빠르게 검색하고 찾을 수 있습니다.
			</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/member2.png" alt="회원수정" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">a</span> <strong>비밀번호</strong></div>
			<p>
				<strong>비밀번호 변경하기</strong><br />
				기존 비밀번호를 알고 있는 경우 비밀번호를 변경할 수 있습니다.<br />
				관리자 계정은 보안을 위해 정기적으로 변경하여 사용하는 것이 좋습니다. 
			</p>
			<p>
				<strong>비밀번호 초기화</strong><br />
				회원이 비밀번호를 분실한 경우에 사용합니다.<br />
				회원의 비밀번호는 강화된 보안정책에 따라 단방향 암호화되므로 관리자도 확인이 불가능합니다.<br />
				이럴 경우 <strong className="blue under-line">비밀번호 초기화</strong>를 통해 비밀번호를 재설정할 수 있습니다.<br />
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">b</span> <strong>프로필사진</strong></div>
			<p>
				기자회원인 경우 프로필 사진을 등록하면 기사 본문 하단에 기자 정보내용에 표시됩니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">c</span> <strong>관리등급</strong></div>
			<p>
				최초 부여한 관리자 계정 외 추가로 관리자계정이 필요할 경우 사용합니다. 이 항목에서 <strong className="blue under-line">관리자</strong>로 선택하면 해당 아이디에 관리자 권한이 부여됩니다.<br />
				※ 퇴사한 직원의 관리자 권한이 계속 유지되고 있지는 않은지 수시로 체크하세요.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">d</span> <strong>회원등급</strong></div>
			<p>
				최초 가입된 회원의 등급은 일반회원입니다.<br />
				회원등급을 <strong className="color-dark under-line">시민기자 / 기자 / 데스크</strong> 중 하나로 설정하시면 <strong className="blue under-line">마이홈</strong>에서 기사쓰기 권한이 부여되며, 관리자모드 기사쓰기화면의 기자명 박스에 이름이 등록됩니다. 
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles"><span className="badge dark">e</span> <strong>필자표시</strong></div>
			<p>
				기사 작성자 이름 뒤에 붙는 직책 표기를 말합니다. 기본값으로는 미표시(작성자 이름만 표시됨)와 기자 항목이 설정되어 있습니다.
			</p>
		</article>
		
	</section>
</section>

<section id="member2" className="manual-section">
	<header className="pages-header">휴면회원관리</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/member3.png" alt="휴면회원목록" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>복구</strong></div>
			<p>
				개인정보보호법에 의해 관리자가 관리하셔야하는 메뉴입니다.<br />
				장기 미접속회원(12개월이상)을 자동으로 휴면회원처리 되며, 이용자의 요구 또는 관리자권한으로 휴면계정을 복원해주는 기능입니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>다운로드</strong></div>
			<p>
				휴면회원 목록을 스프레드시트(Excel) 파일로 다운받을 수 있는 기능입니다.
			</p>
		</article>
		
	</section>
</section>

<section id="ad1" className="manual-section">
	<header className="pages-header">배너(광고)등록하기</header>
	<section className="pages-content">

		
		<figure className="figure">
			<img src="/manual/2.0/image/ad-write01.png" alt="배너(광고)등록하기" />
		</figure>
		

		
		<article className="pages-group">
			<p>
				먼저 배너광고 등록을 위해 우측하단의 등록버튼을 클릭합니다.
			</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/ad-write02.png" alt="배너(광고)등록하기" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>제목</strong></div>
			<p>
				추후 배너광고 검색/관리를 위한 제목을 입력합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>파일첨부</strong></div>
			<p>
				확장자 jpg, png, gif, swf 포멧만 등록 가능합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>상단여백/하단여백</strong></div>
			<p>
				메인화면등에 배너를 배치했을 경우 아래윗쪽 여백을 설정합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">4</span> <strong>진행여부</strong></div>
			<p>
				더이상 배너(광고) 노출을 원치 않는 경우 종료 버튼을 클릭하시면 됩니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">5</span> <strong>시작시간/종료시간</strong></div>
			<p>
				배너(광고)의 시작/종료 시간을 미리 지정해 놓으시면 정해진 기간에만 노출됩니다.
			</p>
		</article>
		
	</section>

</section>

<section id="ad2" className="manual-section">
	<header className="pages-header">팝업등록</header>
	<section className="pages-content">

		
		<figure className="figure">
			<div className="clearfix">
				<img className="clearfix" src="/manual/2.0/image/ad-write03.png" alt="팝업등록" />
			</div>
		</figure>
		

		
		<article className="pages-group">
			<p>
				먼저 팝업 등록을 위해 우측하단의 등록버튼을 클릭합니다.
			</p>
		</article>
		

		
		<figure className="figure">
			<div className="clearfix">
				<img className="clearfix" src="/manual/2.0/image/ad-write04.png" alt="팝업등록" />
			</div>
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>제목</strong></div>
			<p>
				추후 팝업의 검색/관리를 위한 제목을 입력합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>컨텐츠형태</strong></div>
			<p>
				<strong>파일첨부</strong> : 일반적인 이미지형태의 파일을 등록할 경우 사용.<br />
				<strong>HTML</strong> : 간단한 텍스트나 외부소스 등을 등록할 경우 사용.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>파일첨부</strong></div>
			<p>
				확장자 jpg, png, gif, swf 포멧만 등록 가능합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">4</span> <strong>팝업형태</strong></div>
			<p>
				<strong>레이어</strong> : 별도의 창이 아닌 뉴스사이트 창 내에 붙어서 뜨는 레이어 형태의 팝업입니다. 고객 브라우져 설정과 상관없이 강제 노출됩니다.<br />
				<strong>윈도우</strong> : 흔히 접하는 일반적인 팝업창 입니다. 이용자의 브라우져의 설정에 따라 팝업창이 뜨지 않을 수도 있습니다.<br /><br />
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">5</span> <strong>팝업크기</strong></div>
			<p>
				팝업창이 매우 크거나 HTML형태의 경우 강제로 창의 크기를 지정하는 옵션이며,<br />
				일반적인 사이즈의 이미지 파일이면 따로 지정하지 않으셔도 됩니다. 
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">6</span> <strong>팝업표시위치</strong></div>
			<p>
				기본적인 위치는 자동으로 조정되며, 팝업개수가 많거나 특별히 위치지정을 원하는 경우 사용합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">7</span> <strong>하단표시</strong></div>
			<p>
				팝업창 하단에 표시되는 창닫기 옵션의 형태를 지정할 수 있습니다.
			</p>
		</article>
		


	</section>
</section>

<section id="section1" className="manual-section">
	<header className="pages-header">섹션추가</header>
	<section className="pages-content">
		
		<figure className="figure">
			<img src="/manual/2.0/image/section-add01.png" alt="섹션추가" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>섹션명</strong></div>
			<p>
				섹션추가시 일괄등록이 가능합니다.<br />
				예를 들어 1차섹션에 섹션명이 3개일 경우 <strong className="under-line">정치;사회;문화</strong>와 같이 세미콘론<span className="kbd">;</span>(으)로 구분등록이 가능합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">2</span> <strong>큐레이션</strong></div>
			<p>
				각 섹션의 사용자화면을 스페셜페이지(기사모아보기)로 설정 가능합니다.
			</p>
		</article>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">3</span> <strong>타이틀 이미지</strong></div>
			<p>
				설정된 화면의 큐레이션 리스트화면 상단에 이미지를 추가할 수 있습니다.
			</p>
		</article>
		
	</section>
</section>

<section id="section2" className="manual-section">
	<header className="pages-header">연재설정</header>
	<section className="pages-content">
		
		<article className="pages-group">
			<p>
				연재는 시리즈물등의 설계를 위해 개발된 메뉴로서 2차섹션과 비슷하지만 조금 다른 개념입니다.<br />
				2차섹션은 반드시 한 개의 1차섹션에 종속되지만, 연재는 다수의 1차섹션에도 종속되도록 설계되어 있습니다.
			</p>

			<p>
				예를들어 인터뷰라는 코너를 만든다고 가정해 보겠습니다.<br />
				인터뷰라는 메뉴는 1차섹션인 정치/경제/사회/문화 어느 영역에도 다 해당될 수 있는 메뉴일 것입니다.
			</p>

			<p>이를 2차섹션으로 구성한다면 모든 정치/경제/사회/문화 모든 1차섹션에 인터뷰라는 동일한 2차섹션을 중복해서 만들어야하는 문제가 발생합니다.</p>

			<p>이렇게 2개 이상의 1차섹션 아래에 포함되어야 하는 하위메뉴를 만들어야하는 경우, 전체 연재로 구성하시면 해결이 가능합니다.</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/section-add03.png" alt="전체연재설정" />
		</figure>
		

		
		<article className="pages-group">
			<p>특별한 경우가 아니라면 그림과 같이 <strong className="color-point under-line">연재 - 전체섹션</strong>을 선택한 후 등록을 실행해 주세요.</p>
		</article>
		

		
		<figure className="figure">
			<img src="/manual/2.0/image/section-add02.png" alt="연재설정" />
		</figure>
		

		
		<article className="pages-group">
			<div className="pages-titles blue"><span className="badge">1</span> <strong>타입</strong></div>
			<p>
				<strong>연재</strong> : 1차섹션에 종속되는 스페셜 섹션입니다. (상단내용 참조) <br />
				<strong>3차섹션</strong> : 2차섹션에 종속되는 섹션입니다.
			</p>
		</article>
		

	</section>
</section>
	</div>
</div>
</div>
<div style={{ width: 240, minWidth: 240, alignSelf: 'stretch' }}>
<aside className="admin-sidebar-nav"><nav><ul>
		<li className="menu-text"> 동영상 가이드</li>
		<li><a href="https://member.ndsoft.co.kr/manual/cms.html" target="_blank">바로가기 </a></li>
			
		<li className="menu-text">대시보드</li>
<li><a href="#dashboard1" onClick={(e) => { e.preventDefault(); document.getElementById('dashboard1')?.scrollIntoView({ behavior: 'smooth' }); }}>구성안내</a></li>
<li className="menu-text">기사</li>
<li><a href="#write1" onClick={(e) => { e.preventDefault(); document.getElementById('write1')?.scrollIntoView({ behavior: 'smooth' }); }}>기사등록</a></li>
<li><a href="#write2" onClick={(e) => { e.preventDefault(); document.getElementById('write2')?.scrollIntoView({ behavior: 'smooth' }); }}>글쓰기</a></li>
<li><a href="#write3" onClick={(e) => { e.preventDefault(); document.getElementById('write3')?.scrollIntoView({ behavior: 'smooth' }); }}>사진추가</a></li>
<li><a href="#write4" onClick={(e) => { e.preventDefault(); document.getElementById('write4')?.scrollIntoView({ behavior: 'smooth' }); }}>동영상추가</a></li>
<li><a href="#write5" onClick={(e) => { e.preventDefault(); document.getElementById('write5')?.scrollIntoView({ behavior: 'smooth' }); }}>파일추가</a></li>
<li><a href="#write11" onClick={(e) => { e.preventDefault(); document.getElementById('write11')?.scrollIntoView({ behavior: 'smooth' }); }}>미디어N</a></li>
<li><a href="#write7" onClick={(e) => { e.preventDefault(); document.getElementById('write7')?.scrollIntoView({ behavior: 'smooth' }); }}>포토DB</a></li>
<li><a href="#write13" onClick={(e) => { e.preventDefault(); document.getElementById('write13')?.scrollIntoView({ behavior: 'smooth' }); }}>임시보관함</a></li>
<li><a href="#write8" onClick={(e) => { e.preventDefault(); document.getElementById('write8')?.scrollIntoView({ behavior: 'smooth' }); }}>템플릿</a></li>
<li><a href="#write9" onClick={(e) => { e.preventDefault(); document.getElementById('write9')?.scrollIntoView({ behavior: 'smooth' }); }}>특수기호</a></li>
<li><a href="#write12" onClick={(e) => { e.preventDefault(); document.getElementById('write12')?.scrollIntoView({ behavior: 'smooth' }); }}>승인관리</a></li>
<li className="menu-text">편집</li>
<li><a href="#edit1" onClick={(e) => { e.preventDefault(); document.getElementById('edit1')?.scrollIntoView({ behavior: 'smooth' }); }}>구성의이해</a></li>
<li><a href="#edit2" onClick={(e) => { e.preventDefault(); document.getElementById('edit2')?.scrollIntoView({ behavior: 'smooth' }); }}>박스/배너이동</a></li>
<li><a href="#edit3" onClick={(e) => { e.preventDefault(); document.getElementById('edit3')?.scrollIntoView({ behavior: 'smooth' }); }}>메인노출기사편집</a></li>
<li className="menu-text">회원</li>
<li><a href="#member1" onClick={(e) => { e.preventDefault(); document.getElementById('member1')?.scrollIntoView({ behavior: 'smooth' }); }}>회원관리</a></li>
<li><a href="#member2" onClick={(e) => { e.preventDefault(); document.getElementById('member2')?.scrollIntoView({ behavior: 'smooth' }); }}>휴면회원관리</a></li>
<li className="menu-text">광고관리</li>
<li><a href="#ad1" onClick={(e) => { e.preventDefault(); document.getElementById('ad1')?.scrollIntoView({ behavior: 'smooth' }); }}>배너등록</a></li>
<li><a href="#ad2" onClick={(e) => { e.preventDefault(); document.getElementById('ad2')?.scrollIntoView({ behavior: 'smooth' }); }}>팝업등록</a></li>
<li className="menu-text">섹션추가</li>
<li><a href="#section1" onClick={(e) => { e.preventDefault(); document.getElementById('section1')?.scrollIntoView({ behavior: 'smooth' }); }}>섹션추가</a></li>
<li><a href="#section2" onClick={(e) => { e.preventDefault(); document.getElementById('section2')?.scrollIntoView({ behavior: 'smooth' }); }}>연재설정</a></li>
		</ul>
	</nav>
</aside>
</div>

    </div>
  );
}
