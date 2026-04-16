import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ success: false, error: '검색어를 입력해주세요.' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_BROKERAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // NSDI 국가공간정보포털 API 호출
    const targetUrl = `http://openapi.nsdi.go.kr/nsdi/EstateBrokerageService/json/getEAOfficeInfo?authkey=${apiKey}&bsnmCmpnm=${encodeURIComponent(query)}&pageNo=1&numOfRows=100`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`국가공간정보포털 서버 에러 (${response.status})`);
    }

    const data = await response.json();
    
    if (!data || !data.EAOfficeInfo) {
       // 결과가 없는 경우 처리
       return NextResponse.json({ success: true, list: [] });
    }

    const rawList = Array.isArray(data.EAOfficeInfo) ? data.EAOfficeInfo : (data.EAOfficeInfo.list || []);
    
    const formattedList = rawList.map((item: any) => ({
      id: item.brokRegNo || item.rn || Math.random().toString(),
      compName: item.bsnmCmpnm || '',
      ceo: item.rprsnvNm || '',
      addr: item.adres || item.rn || '', 
      regNum: item.brokRegNo || '',
      status: item.sts || '' // 영업중 등
    })).filter((item: any) => item.compName && item.ceo); // 최소값 필터링

    return NextResponse.json({ success: true, list: formattedList });

  } catch (error: any) {
    console.error('Realtor Search API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
