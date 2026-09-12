/* 첨가물 경계 목록 — 데이터 + 성분표 매칭 로직
   브라우저와 Node 양쪽에서 동작 (globalThis.ADDITIVES) */
(function (root) {
"use strict";

const TIER = { A: "확립", B: "재평가·규제 강화", C: "근거 약함" };

/* aliases: 원재료명 표기에서 실제로 쓰이는 문자열(정규화 전). 짧은 별칭은 오탐 위험이 있어 min 길이 규칙을 둠.
   generic: true → 성분 자체가 아니라 '노출원'이나 '용도명'이라 확인 필요로 표시 */
const D = [
{id:"transfat",ko:"트랜스지방 (부분경화유)",en:"Partially hydrogenated oil",cat:"지방·당·염",tier:"A",
 aliases:["부분경화유","경화유","경화식물성유지","쇼트닝","경화야자유","경화팜유","경화대두유","마가린","가공유지"],
 fn:"액체 기름을 굳혀 바삭함·보존성 확보",
 harm:"LDL↑·HDL↓로 심혈관질환 위험을 가장 강하게 높이는 지방. 안전한 섭취량이 없다고 본다.",
 limit:"WHO: 총열량의 1% 미만 (약 2.2 g/일) · 국내 표시: 1회 제공량당 0.2 g 미만이면 '0 g' 표시 가능",
 tip:"'0 g' 표시여도 경화유가 원재료에 있으면 소량 함유 가능. 여러 봉 먹으면 누적."},
{id:"sodium",ko:"나트륨 (식염)",en:"Sodium",cat:"지방·당·염",tier:"A",basic:true,
 aliases:["정제소금","천일염","식염","정제염","소금","구운소금","죽염","암염"],
 fn:"짠맛·보존·식감",
 harm:"고혈압, 뇌졸중, 심혈관질환. 고염식은 위암 위험 요인.",
 limit:"WHO 2,000 mg/일 미만 (소금 5 g) · 국내 1일 기준치 2,000 mg",
 tip:"원재료보다 영양정보의 나트륨 mg를 볼 것. 라면 1봉이면 거의 하루치."},
{id:"sugar",ko:"첨가당 · 액상과당",en:"Added sugar / HFCS",cat:"지방·당·염",tier:"A",basic:true,
 aliases:["액상과당","고과당","고과당옥수수시럽","과당","설탕","백설탕","정백당","물엿","올리고당","포도당","덱스트린","맥아당","전화당","시럽","혼합당","기타과당","결정과당","황설탕","흑설탕"],
 fn:"단맛, 갈변, 보존, 식감",
 harm:"비만, 2형 당뇨, 지방간, 충치.",
 limit:"WHO 유리당 총열량 10% 미만 (2,000 kcal 기준 50 g, 권고 25 g)",
 tip:"원재료 앞쪽에 당류가 여러 이름으로 반복되면 총당량이 높은 제품."},

{id:"nitrite",ko:"아질산나트륨",en:"Sodium nitrite",cat:"보존료·발색제",tier:"A",
 aliases:["아질산나트륨","아질산염","아질산나트륨(발색제)","질산칼륨","질산나트륨","발색제"],
 fn:"육색 고정, 보툴리누스균 억제",
 harm:"고기의 아민과 반응해 니트로사민(발암물질) 생성. 가공육 자체가 IARC 1군.",
 limit:"ADI 0~0.07 mg/kg → 60 kg 성인 4.2 mg/일 · 국내 잔존량: 식육가공품 70 mg/kg 이하",
 tip:"매일 50 g 가공육 섭취 시 대장암 상대위험 약 18%↑(IARC). 비타민C 병기 제품은 니트로사민 생성이 억제됨."},
{id:"benzoate",ko:"벤조산나트륨 (안식향산나트륨)",en:"Sodium benzoate",cat:"보존료·발색제",tier:"B",
 aliases:["벤조산나트륨","안식향산나트륨","벤조산","안식향산","벤조산칼륨","안식향산칼륨","벤조산칼슘","파라옥시안식향산"],
 fn:"산성 식품의 곰팡이·효모 억제 보존료",
 harm:"비타민C·열·빛 조건에서 벤젠(1군 발암물질) 생성 가능. 타르색소 병용 시 어린이 과잉행동 연관.",
 limit:"ADI 0~5 mg/kg → 300 mg/일 · 국내 음료 0.6 g/kg 이하",
 tip:"같은 제품에 '비타민C·아스코르브산'이 함께 있으면 직사광선·고온 보관을 피할 것."},
{id:"sorbate",ko:"소르빈산칼륨",en:"Potassium sorbate",cat:"보존료·발색제",tier:"C",
 aliases:["소르빈산칼륨","소브산칼륨","소르빈산","소브산","소르빈산칼슘","소브산칼슘"],
 fn:"곰팡이·효모 억제 보존료",
 harm:"체내에서 지방산처럼 대사되어 독성 낮음. 아질산과 고온 반응 시 변이원성 물질 가능성(실험실 조건).",
 limit:"ADI 11 mg/kg (EFSA 2019) → 660 mg/일 · 국내 어육가공품 2 g/kg, 치즈 3 g/kg",
 tip:"보존료 중 가장 안전하다는 평가. 아질산나트륨과 같은 제품에 있으면 그쪽을 먼저 볼 것."},
{id:"sulfite",ko:"아황산염",en:"Sulfites",cat:"보존료·발색제",tier:"B",
 aliases:["아황산나트륨","메타중아황산칼륨","메타중아황산나트륨","무수아황산","차아황산나트륨","산성아황산나트륨","아황산염","이산화황","아황산"],
 fn:"표백·갈변 방지·산화방지",
 harm:"천식 환자의 5~10%에서 기관지 수축·아나필락시스. 비타민B1 파괴. 알레르기 표시 대상.",
 limit:"ADI 0~0.7 mg/kg (SO₂) → 42 mg/일 · 국내 건조과실 2 g/kg",
 tip:"천식·아스피린 민감자는 피할 것. 건과일은 데치거나 물에 담그면 일부 제거."},

{id:"y4",ko:"황색 4호 (타르트라진)",en:"Tartrazine E102",cat:"착색료",tier:"B",
 aliases:["황색제4호","황색4호","식용색소황색제4호","타르트라진","황색제4호알루미늄레이크","황색4호알루미늄레이크"],
 fn:"레몬색 합성 착색료",
 harm:"어린이 과잉행동 연관(Southampton 2007). 두드러기·천식 등 과민반응.",
 limit:"ADI 0~7.5 mg/kg → 450 mg/일 · 국내 식품유형별 0.1~0.6 g/kg",
 tip:"EU는 '어린이 활동·주의력 악영향 가능' 경고 문구 의무. 미국은 2026년 말 퇴출 목표."},
{id:"y5",ko:"황색 5호 (선셋옐로)",en:"Sunset Yellow E110",cat:"착색료",tier:"B",
 aliases:["황색제5호","황색5호","식용색소황색제5호","선셋옐로","황색제5호알루미늄레이크"],
 fn:"주황색 합성 착색료",
 harm:"Southampton 6종 색소 중 하나. 과민반응. 고용량 동물실험 결과로 EFSA가 ADI 하향.",
 limit:"ADI 0~4 mg/kg → 240 mg/일",
 tip:"미국 자발적 퇴출 대상."},
{id:"r40",ko:"적색 40호 (알루라레드)",en:"Allura Red E129",cat:"착색료",tier:"B",
 aliases:["적색제40호","적색40호","식용색소적색제40호","알루라레드","적색제40호알루미늄레이크"],
 fn:"밝은 빨강 합성 착색료",
 harm:"Southampton 6종 중 하나. 동물실험(2022)에서 장 염증 악화 보고, 사람 근거는 제한적.",
 limit:"ADI 0~7 mg/kg → 420 mg/일",
 tip:"미국 2026년 말 자발적 퇴출 목표, 일부 주 학교급식 금지."},
{id:"r2",ko:"적색 2호 (아마란스)",en:"Amaranth E123",cat:"착색료",tier:"B",
 aliases:["적색제2호","적색2호","식용색소적색제2호","아마란스","적색제102호","적색102호","뉴콕신"],
 fn:"자주빛 빨강 합성 착색료",
 harm:"1970년대 쥐 실험에서 발암·생식독성 의심. 미국 1976년 금지.",
 limit:"ADI 0.15 mg/kg (EFSA) → 9 mg/일 · 국내: 어린이 기호식품(과자·캔디·빙과·음료) 사용 금지",
 tip:"어린이 기호식품에서 발견되면 규정 위반. 적색 102호도 동일."},
{id:"r3",ko:"적색 3호 (에리트로신)",en:"Erythrosine E127",cat:"착색료",tier:"B",
 aliases:["적색제3호","적색3호","식용색소적색제3호","에리트로신","에리스로신"],
 fn:"체리색 합성 착색료",
 harm:"수컷 쥐 갑상선 종양. 미 FDA 2025.1 식품 사용 금지 결정(2027.1 시행).",
 limit:"ADI 0~0.1 mg/kg → 6 mg/일 · 국내 어린이 기호식품 사용 금지",
 tip:"타르색소 중 ADI가 가장 낮은 축."},
{id:"tar",ko:"타르색소 (종류 미표기)",en:"Synthetic azo dye (unspecified)",cat:"착색료",tier:"B",generic:true,not:/착향|향료|천연/,
 aliases:["타르색소","합성착색료","청색제1호","청색1호","청색제2호","청색2호","녹색제3호","녹색3호","식용색소"],
 fn:"합성 착색료",
 harm:"청색 1·2호, 녹색 3호는 ADI 여유가 크나 미국 퇴출 목록에 포함. 종류가 안 보이면 어떤 색소인지 확인 필요.",
 limit:"색소별 상이 (청색1호 ADI 6 mg/kg, 청색2호 5, 녹색3호 25)",
 tip:"'식용색소'만 적힌 경우 구체 품목은 제조사 문의."},
{id:"caramel",ko:"카라멜색소",en:"Caramel color III/IV",cat:"착색료",tier:"B",
 aliases:["카라멜색소","캐러멜색소","카라멜","캐러멜","카라멜색소iii","카라멜색소iv","카라멜색소(iv)","카라멜색소(iii)"],
 fn:"갈색 착색 (콜라·간장색)",
 harm:"제조 부산물 4-MEI(IARC 2B). 카라멜 I은 해당 없음.",
 limit:"카라멜 III·IV 그룹 ADI 200 mg/kg · 4-MEI 캘리포니아 경고 기준 29 µg/일",
 tip:"등급이 표시되지 않으면 III·IV로 가정. 콜라·간장·흑맥주가 주 노출원."},
{id:"tio2",ko:"이산화티타늄",en:"Titanium dioxide E171",cat:"착색료",tier:"B",
 aliases:["이산화티타늄","산화티탄","이산화티탄","산화티타늄"],
 fn:"백색 착색·불투명화",
 harm:"나노입자 축적·유전독성 배제 불가(EFSA). EU 2022 식품 사용 금지, 국내·미국은 허용.",
 limit:"EFSA: ADI 설정 불가 · 국내 사용량 제한 없음",
 tip:"껌·흰 사탕·초콜릿 코팅·마시멜로에 흔함."},

{id:"aspartame",ko:"아스파탐",en:"Aspartame E951",cat:"감미료",tier:"C",
 aliases:["아스파탐","아스파탐(페닐알라닌함유)","페닐알라닌"],
 fn:"설탕 200배 감미료",
 harm:"IARC 2B(2023, 근거 제한적), JECFA ADI 유지. 페닐케톤뇨증 환자 섭취 금지.",
 limit:"ADI 0~40 mg/kg → 2,400 mg/일 (제로콜라 약 12캔)",
 tip:"실제 노출은 ADI의 수 % 수준. WHO는 감미료의 체중 조절 목적 사용을 비권고(2023)."},
{id:"sucralose",ko:"수크랄로스",en:"Sucralose E955",cat:"감미료",tier:"C",
 aliases:["수크랄로스","슈크랄로스","수크라로스"],
 fn:"설탕 600배 감미료",
 harm:"동물실험에서 장내 미생물 변화. 120℃ 이상 가열 시 염소화합물 생성 가능.",
 limit:"ADI 0~15 mg/kg → 900 mg/일",
 tip:"고온 조리(베이킹) 용도로는 피하는 게 보수적."},
{id:"acek",ko:"아세설팜칼륨",en:"Acesulfame K E950",cat:"감미료",tier:"C",
 aliases:["아세설팜칼륨","아세설팜k","아세설팜포타슘","아세설팜"],
 fn:"설탕 200배 감미료. 혼합 사용",
 harm:"체내 대사 없이 배출. 고용량 동물실험 외 사람 근거 미약. EFSA 2025 재평가: 안전.",
 limit:"ADI 0~15 mg/kg → 900 mg/일",
 tip:"혼합 감미료 총량이 논점."},
{id:"saccharin",ko:"사카린나트륨",en:"Sodium saccharin E954",cat:"감미료",tier:"C",
 aliases:["사카린나트륨","사카린","삭카린나트륨","삭카린"],
 fn:"설탕 300배 감미료",
 harm:"1970년대 쥐 방광암 논란 → 쥐 특이 기전으로 판명. 현재 안전 평가(IARC 3군).",
 limit:"ADI 0~5 mg/kg → 300 mg/일",
 tip:"통념과 달리 과학적 근거는 뒤집힌 사례."},
{id:"erythritol",ko:"에리스리톨",en:"Erythritol E968",cat:"감미료",tier:"C",
 aliases:["에리스리톨","에리트리톨","에리쓰리톨"],
 fn:"당알코올 감미료. '제로슈거' 과자에 다량",
 harm:"2023년 혈중 농도↑와 혈전·심혈관 사건 연관(관찰연구, 인과 미확립). 다량 섭취 시 설사.",
 limit:"EFSA 2023: 0.5 g/kg (완하 효과 기준) → 30 g/일",
 tip:"제로 과자 한 봉에 10~20 g 들어가는 경우도 있어 도달 가능."},

{id:"bha",ko:"BHA (부틸히드록시아니솔)",en:"BHA E320",cat:"산화방지제",tier:"B",
 aliases:["부틸히드록시아니솔","부틸하이드록시아니솔","bha","비에이치에이"],
 fn:"유지 산패 방지",
 harm:"쥐 전위 종양(IARC 2B). 내분비 교란 의심으로 미 FDA 2026 재평가 중.",
 limit:"ADI 0~0.5 mg/kg → 30 mg/일 · 국내 유지 0.2 g/kg",
 tip:"시리얼·껌·기름·건조 육류에 소량."},
{id:"bht",ko:"BHT (디부틸히드록시톨루엔)",en:"BHT E321",cat:"산화방지제",tier:"C",
 aliases:["디부틸히드록시톨루엔","디부틸하이드록시톨루엔","bht","비에이치티"],
 fn:"유지 산패 방지",
 harm:"고용량 동물실험에서 간·갑상선 영향. 사람 발암 근거 없음(IARC 3군).",
 limit:"ADI 0~0.3 mg/kg → 18 mg/일",
 tip:"식품보다 포장재·화장품 노출이 많다."},
{id:"tbhq",ko:"TBHQ (터셔리부틸히드로퀴논)",en:"TBHQ E319",cat:"산화방지제",tier:"B",
 aliases:["터셔리부틸히드로퀴논","터셔리부틸하이드로퀴논","tbhq","티비에이치큐"],
 fn:"튀김유·식용유 산화방지",
 harm:"고용량 동물실험에서 면역세포 영향·종양 촉진. 사람 근거 제한적.",
 limit:"ADI 0~0.7 mg/kg → 42 mg/일 · 국내 유지 0.2 g/kg",
 tip:"국내 라면 다수는 토코페롤로 전환. 수입 과자·냉동 튀김에서 볼 수 있다."},

{id:"phosphate",ko:"인산염류",en:"Phosphates E338–452",cat:"인산염·유화·증점",tier:"B",
 aliases:["인산","인산염","피로인산나트륨","폴리인산나트륨","메타인산나트륨","제이인산나트륨","제삼인산나트륨","제일인산나트륨","제이인산칼륨","제삼인산칼륨","제일인산칼륨","제이인산칼슘","제삼인산칼슘","제일인산칼슘","피로인산칼륨","폴리인산칼륨","산성피로인산나트륨","헥사메타인산나트륨","인산이수소나트륨","인산일수소나트륨","인산삼칼슘","복합인산염"],
 fn:"산도조절(콜라), 결착·보수(햄), 유화(가공치즈), 면 식감",
 harm:"첨가 무기인은 흡수율 90%↑. 혈관 석회화, 신장 부담, 칼슘 대사 교란. 만성신장병 환자 특히 주의.",
 limit:"그룹 ADI 40 mg/kg (EFSA, 인 기준) → 2,400 mg/일 · 콜라 355 mL ≈ 인 40~50 mg",
 tip:"첨가물 중 실제 노출이 ADI에 가장 근접한 축. '산도조절제'라고만 적혀 있으면 인산염일 가능성."},
{id:"acidreg",ko:"산도조절제 (종류 미표기)",en:"Acidity regulator (unspecified)",cat:"인산염·유화·증점",tier:"B",generic:true,
 aliases:["산도조절제"],
 fn:"pH 조절 — 구연산·젖산 등 무해한 것부터 인산염까지 포괄",
 harm:"용도명만 표시된 경우라 실제 성분을 알 수 없음. 인산염이면 위 인산염류 항목 참조.",
 limit:"성분에 따라 다름",
 tip:"국내 표시 규정상 용도명만 적을 수 있어 흔히 보인다. 탄산음료·가공육이면 인산염일 확률이 높다."},
{id:"carrageenan",ko:"카라기난",en:"Carrageenan E407",cat:"인산염·유화·증점",tier:"C",
 aliases:["카라기난","카라키난","카라지난"],
 fn:"증점·안정제",
 harm:"식품용 고분자 카라기난은 흡수되지 않음. 분해 카라기난 연구와 혼동. 일부 동물·세포 연구에서 장 염증 신호.",
 limit:"ADI 'not specified' (JECFA 2014) · 영유아식 제한",
 tip:"장 질환자 중 제거 후 개선 보고 있음(개인차)."},
{id:"emulsifier",ko:"유화제 (폴리소르베이트 · CMC)",en:"Polysorbate 80 / CMC",cat:"인산염·유화·증점",tier:"C",
 aliases:["폴리소르베이트80","폴리소르베이트60","폴리소르베이트20","폴리소르베이트","카복시메틸셀룰로스나트륨","카르복시메틸셀룰로스나트륨","카복시메틸셀룰로스","카르복시메틸셀룰로스","cmc","셀룰로스검"],
 fn:"기름과 물을 섞고 식감을 매끈하게",
 harm:"쥐 연구(2015)에서 장 점액층 약화·염증. 사람 장기 근거는 부족.",
 limit:"폴리소르베이트류 그룹 ADI 25 mg/kg → 1,500 mg/일 · CMC 'not specified'",
 tip:"'유화제'라고만 적히면 레시틴(무해)일 수도 있어 확인 필요."},

{id:"msg",ko:"MSG (L-글루탐산나트륨)",en:"Monosodium glutamate E621",cat:"향미증진",tier:"C",
 aliases:["l-글루탐산나트륨","글루탐산나트륨","글루타민산나트륨","l-글루타민산나트륨","msg","향미증진제","5'-리보뉴클레오티드이나트륨","5-리보뉴클레오티드이나트륨","리보뉴클레오티드"],
 fn:"감칠맛 부여",
 harm:"'중국식당 증후군'은 이중맹검에서 대부분 재현 실패. 공복 3 g 이상 단회 섭취 시 일부 일시적 두통·홍조. 나트륨 기여.",
 limit:"JECFA 'not specified' · EFSA 그룹 ADI 30 mg/kg → 1,800 mg/일",
 tip:"통념보다 근거가 약한 대표 사례. 실질적 문제는 나트륨 총량."},

{id:"ada",ko:"아조디카르본아미드 (ADA)",en:"Azodicarbonamide E927a",cat:"밀가루 개량제",tier:"B",
 aliases:["아조디카르본아미드","아조디카본아미드","아조디카르본아마이드"],
 fn:"밀가루 표백·글루텐 강화",
 harm:"가열 시 세미카바자이드·우레탄(2A) 생성. EU·호주 금지, 국내 허용.",
 limit:"국내 밀가루 45 mg/kg 이하",
 tip:"국내 대형 제빵사는 대부분 사용 중단. 수입 냉동 빵·믹스에서 볼 수 있다."},
{id:"bromate",ko:"브롬산칼륨",en:"Potassium bromate",cat:"밀가루 개량제",tier:"B",
 aliases:["브롬산칼륨","브로민산칼륨","브롬산염"],
 fn:"반죽 탄력·볼륨 개선",
 harm:"쥐 신장·갑상선 종양(IARC 2B). 한국·EU 금지, 미국 일부 허용.",
 limit:"국내 사용 금지 (첨가물 미지정)",
 tip:"국내 제품에서 보이면 위반. 미국산 수입 빵·믹스 주의."},

{id:"palm",ko:"팜유 (3-MCPD·글리시딜 에스테르 노출원)",en:"Palm oil — 3-MCPD/GE source",cat:"가공 중 생성물",tier:"B",generic:true,basic:true,
 aliases:["팜유","팜올레인유","팜올레인","팜핵유","팜스테아린","정제팜유","식물성유지(팜유)"],
 fn:"튀김·코팅용 유지. 고온 정제 과정에서 3-MCPD·글리시딜 에스테르 생성",
 harm:"3-MCPD: 신장 손상(2B). 글리시돌: 유전독성 발암물질(2A). 정제 팜유가 주 노출원.",
 limit:"3-MCPD TDI 2 µg/kg → 120 µg/일 · EU 글리시딜에스테르 유지 1,000 µg/kg",
 tip:"성분표에서 직접 보이는 건 팜유뿐이라 '노출원'으로만 표시. 원재료 앞쪽에 있을수록 함량이 많다."},
{id:"acrylamide",ko:"아크릴아마이드 (고온 조리 생성물)",en:"Acrylamide — process contaminant",cat:"가공 중 생성물",tier:"A",generic:true,basic:true,
 aliases:[],
 fn:"120℃ 이상 굽기·튀김에서 생성. 감자·곡류 스낵이 주 노출원",
 harm:"IARC 2A. 동물 발암·신경독성. 안전 섭취량 없음(ALARA).",
 limit:"국내 권장규격: 과자·감자튀김 1,000 µg/kg, 시리얼 300, 커피 800",
 tip:"성분표엔 안 나온다. 감자·밀가루 + 튀김/굽기 제품이면 노출을 가정. 색이 짙을수록 많다."},

{id:"caffeine",ko:"카페인",en:"Caffeine",cat:"기타",tier:"B",
 aliases:["카페인","무수카페인","카페인무수물","과라나추출물","과라나"],
 fn:"각성. 콜라·에너지음료엔 향미 목적 첨가",
 harm:"불면·불안·심계항진, 청소년 의존·수면 장애, 임산부 저체중아 위험.",
 limit:"성인 400 mg/일 · 청소년 2.5 mg/kg (60 kg 기준 150 mg) · 임산부 300",
 tip:"에너지음료 250 mL ≈ 80 mg, 콜라 355 mL ≈ 35 mg."}
];

/* ---------- 매칭 ---------- */
const norm = s => String(s||"").toLowerCase()
  .replace(/[\s ]/g,"")
  .replace(/[·ㆍ・\-–—_'’"“”]/g,"")
  .replace(/[（]/g,"(").replace(/[）]/g,")");

// 별칭 색인 (긴 것부터 검사 → 구체 항목이 먼저 잡힘)
const INDEX = [];
D.forEach(d => d.aliases.forEach(a => INDEX.push({a: norm(a), d})));
INDEX.sort((x,y)=>y.a.length-x.a.length);

// 짧은 별칭(≤3자)은 정확 토큰 일치일 때만 인정
const SHORT = 3;

function bigrams(s){ const r=new Set(); for(let i=0;i<s.length-1;i++) r.add(s.slice(i,i+2)); return r; }
function lev(a,b){ const m=a.length,n=b.length; const dp=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]); for(let j=1;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return dp[m][n]; }
function dice(a,b){ if(a.length<2||b.length<2) return 0; const A=bigrams(a),B=bigrams(b); let n=0; A.forEach(g=>{if(B.has(g)) n++;}); return 2*n/(A.size+B.size); }

/** OCR 텍스트에서 원재료 토큰 추출 */
function tokenize(text){
  const cleaned = String(text||"")
    .replace(/\r/g,"\n")
    .replace(/[|｜]/g,",");
  // 원재료명 섹션이 있으면 그 이후를 우선 (영양정보 등은 뒤로)
  let body = cleaned;
  const m = cleaned.search(/원\s*재\s*료\s*명|원\s*료\s*명|성\s*분\s*명|원재료/);
  if (m >= 0) body = cleaned.slice(m);
  const raw = body.split(/[,，、;:\n\/\[\]{}]|(?<=\))|(?=\()/).map(s=>s.replace(/[()]/g,"").trim()).filter(Boolean);
  const HEAD = /^(원재료명|원료명|성분명|원재료|식품유형|내용량|유통기한|영양정보|제조원|판매원)/;
  return raw.map(norm).filter(t=>t.length>=2 && !HEAD.test(t));
}

/** 매칭: {hits:[{d, exact:boolean, token, alias}], tokens} */
function match(text){
  const tokens = tokenize(text);
  const whole = norm(text);
  const hits = new Map();
  const add = (d, info) => { const prev = hits.get(d.id); if(!prev || (info.exact && !prev.exact)) hits.set(d.id, {d, ...info}); };

  // 1) 전체 텍스트 포함 검사 (긴 별칭 우선, 잡힌 구간은 소거해 부분 문자열 중복 방지)
  let rest = whole;
  for (const {a,d} of INDEX){
    if (a.length <= SHORT) continue;
    if (rest.includes(a)) { add(d, {exact:true, token:a, alias:a}); rest = rest.split(a).join("§"); }
  }
  // 2) 토큰 단위: 짧은 별칭 정확 일치 + 퍼지(OCR 오타)
  const consumed = t => INDEX.some(({a,d}) => a.length>SHORT && t.includes(a) && hits.get(d.id)?.exact);
  for (const t of tokens){
    if (consumed(t)) continue;                     // 이미 정확히 잡힌 토큰은 퍼지 대상에서 제외
    for (const {a,d} of INDEX){
      if (hits.has(d.id) && hits.get(d.id).exact) continue;
      if (a.length <= SHORT){ if (t===a) add(d,{exact:true,token:t,alias:a}); continue; }
      if (t.length < 4 || Math.abs(t.length-a.length) > Math.max(2, a.length*0.34)) continue;
      if (t[0] !== a[0]) continue;                 // OCR 오류는 보통 중간 글자 — 첫 글자는 일치 요구
      if (d.not && d.not.test(t)) continue;          // 착향료≠착색료 같은 한 글자 차이 오탐 방지
      const s = Math.max(dice(t,a), 1 - lev(t,a)/Math.max(t.length,a.length));
      if (s >= 0.66) add(d,{exact:false,token:t,alias:a,score:s});
    }
  }
  // 3) 아크릴아마이드: 감자/밀가루 + 튀김/유지 조합이면 노출 가정
  const potato = /감자|고구마|밀가루|소맥분|옥수수|곡류|전분/.test(whole);
  const fried = /튀김|유지|기름|팜유|해바라기유|대두유|카놀라유|옥수수유|구운|베이킹|비스킷|크래커|스낵/.test(whole);
  if (potato && fried) add(D.find(d=>d.id==="acrylamide"), {exact:false, token:"감자/곡류 + 튀김·굽기", alias:"추정", inferred:true});

  // 원재료명은 함량 내림차순 표기 — 각 항목이 목록 몇 번째인지 기록한다
  for (const h of hits.values()){
    if (h.inferred){ h.pos = null; continue; }
    let i = tokens.findIndex(t => t.includes(h.alias) || h.alias.includes(t) && t.length>=4);
    if (i < 0) i = tokens.findIndex(t => t.includes(h.token) || h.token.includes(t));
    h.pos = i < 0 ? null : i;
  }
  const order = {A:0,B:1,C:2};
  const list = [...hits.values()].sort((x,y)=> order[x.d.tier]-order[y.d.tier] || (y.exact-x.exact));
  return {hits:list, tokens};
}

/** 한 줄 판정 */
function verdict(allHits){
  const hits = allHits.filter(h=>!h.d.basic);   // 당·소금·팜유·아크릴아마이드는 '양의 문제'라 판정에서 제외, 참고로만 표시
  const a = hits.filter(h=>h.d.tier==="A").length, b = hits.filter(h=>h.d.tier==="B").length, c = hits.filter(h=>h.d.tier==="C").length;
  let head, tone;
  if (a>=2 || (a>=1 && b>=2)) { head="주의해서 드세요"; tone="A"; }
  else if (a>=1 || b>=2) { head="양을 의식하세요"; tone="B"; }
  else if (b>=1 || c>=1) { head="크게 걱정할 건 없어요"; tone="C"; }
  else { head="경계 첨가물이 없어요"; tone="ok"; }
  const parts=[]; if(a) parts.push(`확립 ${a}`); if(b) parts.push(`재평가 ${b}`); if(c) parts.push(`근거 약함 ${c}`);
  return {head, tone, sub: parts.length? parts.join(" · ") : "31종 경계 목록 기준"};
}

root.ADDITIVES = { D, TIER, norm, tokenize, match, verdict };
})(typeof globalThis!=="undefined"?globalThis:this);
if (typeof module!=="undefined") module.exports = globalThis.ADDITIVES;
