-- ============================================================
--  Dallas & Las Vegas Trip App — Korean translation
-- ============================================================
--
--  HOW TO RUN THIS
--    SQL Editor -> New query -> paste this whole file -> Run
--
--  Adds Korean columns to the itinerary and fills in translations
--  for the 15 stops that shipped with the app.
--
--  Safe to run more than once, and safe on a database the family
--  has already edited: it only fills a Korean field that is still
--  empty, and only for stops whose English title still matches the
--  original. Stops you added or reworded are left alone.
--
--  The app falls back to the English column whenever a Korean one
--  is missing, so nothing ever disappears for want of a translation.
-- ============================================================

alter table public.stops add column if not exists title_ko       text;
alter table public.stops add column if not exists description_ko text;
alter table public.stops add column if not exists time_label_ko  text;


update public.stops as s
   set time_label_ko  = coalesce(s.time_label_ko,  v.time_ko),
       title_ko       = coalesce(s.title_ko,       v.title_ko),
       description_ko = coalesce(s.description_ko, v.desc_ko)
  from (values

  ('Arrive Dallas-Fort Worth — Delta #2798',
   '오전 11:44', '댈러스포트워스 공항 도착 — 델타 #2798',
   '솔트레이크시티에서 출발해 도착해요. 좌석이 게이트에서 배정되니 내릴 때 시간을 조금 여유 있게 잡으세요.'),

  ('Klyde Warren Park',
   '오후', '클라이드 워런 공원 (Klyde Warren Park)',
   '도착 후 첫 코스로 부담 없어요. 고속도로 위에 지은 공원으로 놀이터, 푸드트럭, 잔디밭 게임이 있습니다. 비행 뒤 다리 풀기 좋아요.'),

  ('Dinner nearby',
   '저녁', '근처에서 저녁',
   '익스체인지 푸드홀이나 로데오 고트 둘 다 다운타운에서 차로 금방이고, 입맛 까다로운 사람도 고르기 좋아요 — ''음식'' 탭을 보세요.'),

  ('State Fair of Texas, Fair Park',
   '하루 종일', '텍사스 주 박람회, 페어 파크',
   '토요일에 가면 분위기를 제대로 즐길 수 있어요. 놀이기구, 자동차 쇼, 가축 축사, 그리고 온갖 튀김 음식까지. 페어 파크는 걸어 다닐 만하지만 하루가 깁니다 — 사람과 더위를 피하려면 일찍 가세요.'),

  ('Children''s Aquarium at Fair Park',
   '시간 되면', '페어 파크 어린이 아쿠아리움 (Children''s Aquarium)',
   '박람회장 안에 있어요. 가오리 체험 수조와 아홀로틀이 있어, 어린아이들이 잠깐 쉬어 가기 좋습니다.'),

  ('The Dallas World Aquarium',
   '오전', '댈러스 월드 아쿠아리움 (Dallas World Aquarium)',
   '수족관 반, 동물원 반이에요. 재규어, 나무늘보, 박쥐가 수조와 함께 있습니다. 낮이 되면 유모차로 붐비니 일찍 가세요.'),

  ('Museum of Illusions',
   '낮', '착시 박물관 (Museum of Illusions)',
   '자유 관람에 체험형이고 한 시간쯤 걸려요. 많이 걷는 일정 사이에 쉬어 가기 좋습니다.'),

  ('Reunion Tower',
   '해질녘', '리유니언 타워 (Reunion Tower)',
   '지오덱(GeO-Deck)에서 360도로 스카이라인이 보여요. 도시에 불이 켜지기 시작하는 해질녘이 가장 좋습니다.'),

  ('Depart Dallas — Southwest #1368',
   '오전 7:35', '댈러스 출발 — 사우스웨스트 #1368',
   '댈러스 러브 필드(DAL)에서 오전 7시 35분 출발이에요. 이른 비행이라 짐은 전날 밤에 다 싸두세요 — 그날 아침에는 댈러스에서 들를 시간이 없습니다.'),

  ('Arrive Las Vegas — Southwest #1368',
   '오전 8:30', '라스베이거스 도착 — 사우스웨스트 #1368',
   '한국에서 온 조카와 함께 지냅니다.'),

  ('Bellagio Conservatory & Botanical Gardens',
   '무료', '벨라지오 컨서버토리 & 보태니컬 가든',
   '벨라지오 안에 있는 무료 계절 꽃 전시예요. 첫 코스로 부담 없고, 보통 오전이 가장 한산합니다.'),

  ('Flamingo Wildlife Habitat',
   '무료', '플라밍고 야생동물 서식지 (Flamingo Wildlife Habitat)',
   '플라밍고 호텔 안의 그늘진 열대 정원으로, 진짜 홍학과 잉어, 거북이가 있어요. 카지노에서 잠깐 벗어나기 좋고 입장은 무료입니다.'),

  ('Shark Reef Aquarium, Mandalay Bay',
   '1~2시간', '샤크 리프 아쿠아리움, 만달레이 베이',
   '상어, 가오리 체험 수조, 난파선 전시실이 있어요. 아이들에게 늘 인기입니다. 성인 약 $29, 어린이 약 $24.'),

  ('Museum of Illusions, Las Vegas',
   '1~1.5시간', '착시 박물관, 라스베이거스',
   '댈러스와 같은 체험형이지만 전시는 달라요. 댈러스에서 이미 갔다면 건너뛰고, 아니라면 날씨와 상관없이 즐길 수 있는 선택지예요.'),

  ('The Sphere',
   '저녁', '스피어 (The Sphere)',
   '베이거스에서만 할 수 있는 화려한 경험을 하나 원한다면 값어치를 해요. 공연과 티켓이 매진되니 미리 예매하세요. 다른 일정보다는 비쌉니다.')

) as v(match_title, time_ko, title_ko, desc_ko)
 where s.title = v.match_title;
