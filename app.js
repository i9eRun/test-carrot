const get = (id) => document.getElementById(id);
const categories = ['가구·인테리어', '디지털기기', '스포츠·레저', '생활용품', '기타'];
const samples = [
  { title: '원목 의자', price: 25000, category: categories[0], image: 'photos/chair.jpg', description: '가볍게 사용한 원목 의자입니다. 성수역 근처에서 거래할 수 있어요.' },
  { title: '디지털 카메라', price: 95000, category: categories[1], image: 'photos/camera.jpg', description: '사진 입문용으로 쓰던 카메라예요. 직접 상태를 확인하실 수 있습니다.' },
  { title: '동네 산책용 자전거', price: 120000, category: categories[2], image: 'photos/bicycle.jpg', description: '주말에 동네에서 타던 자전거입니다. 직거래 가능합니다.' },
];
const storageKey = 'dongne-store-listings-v1';
const won = new Intl.NumberFormat('ko-KR');
const formatPrice = (value) => value === 0 ? '나눔' : won.format(value) + '원';
let activeCategory = '전체';
let listings = [];

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) listings = saved;
} catch (error) {
  console.warn('저장된 판매글을 불러올 수 없습니다.', error);
}

const detail = get('detail');
const editor = get('editor');
const form = get('listing-form');
const search = get('search');
const list = get('list');
const formError = get('form-error');
const submit = form.querySelector('button[type="submit"]');

for (const category of categories) form.elements.category.add(new Option(category));
for (const category of ['전체', ...categories]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = category;
  button.setAttribute('aria-pressed', String(category === activeCategory));
  button.addEventListener('click', () => {
    activeCategory = category;
    for (const item of get('categories').children) {
      item.setAttribute('aria-pressed', String(item === button));
    }
    render();
  });
  get('categories').append(button);
}

function showDetail(item) {
  get('detail-title').textContent = item.title;
  get('detail-image').src = item.image;
  get('detail-image').alt = item.title;
  get('detail-price').textContent = formatPrice(item.price);
  get('detail-meta').textContent = '성수동 · ' + item.category + (item.sample ? ' · 예시 매물' : '');
  get('detail-description').textContent = item.description;
  detail.showModal();
}

function render() {
  const query = search.value.trim().toLocaleLowerCase('ko-KR');
  const results = [...listings, ...samples.map((item) => ({ ...item, sample: true }))].filter((item) => (
    (activeCategory === '전체' || item.category === activeCategory) &&
    [item.title, item.description].some((value) => value.toLocaleLowerCase('ko-KR').includes(query))
  ));
  get('count').textContent = results.length + '개';
  list.replaceChildren();
  if (!results.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '조건에 맞는 매물이 없어요.';
    list.append(empty);
  }
  for (const item of results) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    const image = new Image();
    image.src = item.image;
    image.alt = '';
    const copy = document.createElement('span');
    copy.className = 'card-copy';
    const title = document.createElement('span');
    title.textContent = item.title;
    const price = document.createElement('strong');
    price.textContent = formatPrice(item.price);
    const meta = document.createElement('small');
    meta.className = 'muted';
    meta.textContent = '성수동 · ' + (item.sample ? '예시 매물' : '내 판매글');
    copy.append(title, price, meta);
    card.append(image, copy);
    card.addEventListener('click', () => showDetail(item));
    list.append(card);
  }
}

async function encodePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error('15MB 이하 JPEG, PNG 또는 WebP 사진을 선택해 주세요.');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.');
  }
  try {
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.75);
  } finally {
    bitmap.close();
  }
}

get('write').addEventListener('click', () => editor.showModal());
search.addEventListener('input', render);
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  const data = new FormData(form);
  const title = data.get('title').trim();
  const description = data.get('description').trim();
  formError.hidden = true;
  submit.disabled = true;
  try {
    if (!title || !description) throw new Error('제목과 설명을 입력해 주세요.');
    const image = await encodePhoto(data.get('photo'));
    const item = { title, description, image, price: Number(data.get('price')), category: data.get('category') };
    const updated = [item, ...listings];
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      throw new Error('브라우저에 판매글을 저장할 수 없어요. 저장 공간이나 브라우저 설정을 확인해 주세요.');
    }
    listings = updated;
    form.reset();
    editor.close();
    search.value = '';
    get('categories').firstElementChild.click();
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

render();
