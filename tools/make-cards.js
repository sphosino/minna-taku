// お題ごとの「シェア用ページ」と「カードの画像」を作る
//   cd tools && npm install   （はじめの1回だけ。playwright-core を入れる）
//   node make-cards.js        （足りない分・お題が変わった分だけ作る）
//   node make-cards.js --all  （全部作りなおす）
//
// 作るもの（docs/q/ の下。GitHub Pages でそのまま公開される）
//   <id>.html：X などにリンクを貼ったときのカード用。題名・説明・画像だけを持ち、開いた人はすぐ ../?q=<id> へ移る
//   <id>.jpg ：カードの画像（1200×630）。お題の文と選択肢。割合は入れない（答える前のお楽しみ）
//   cards.json：お題の文と選択肢の控え。変わったお題だけ作りなおすのに使う
// 画像はパソコンの Chrome で描く（ブラウザのダウンロードはしない）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright-core');

const API = 'https://bhnkfafrnrddtkdkwvso.supabase.co/functions/v1/minna';
const SITE = 'https://mataasobo.com/minna-taku/';
const OUT = path.join(__dirname, '..', 'docs', 'q');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ALL = process.argv.includes('--all');
const COLORS = ['#2f54eb', '#e8590c', '#0c9b6b', '#b23ad1', '#d6a20b', '#e0457b']; // index.html の --c1〜--c6

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const NUM = ['①', '②', '③', '④', '⑤', '⑥'];

// シェア用ページ。クローラーは JavaScript を動かさないので、ここに書いた題名と画像がカードになる
function pageHTML(q) {
  const url = `${SITE}q/${q.id}.html`, img = `${SITE}q/${q.id}.jpg`;
  const title = `${q.text}｜みんなの〇択`;
  const desc = `${q.choices.map((c, i) => NUM[i] + c).join(' ')}　あなたはどれ？ 答えると、みんなの割合が見られます。`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="みんなの〇択">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${SITE}?q=${q.id}">
<link rel="icon" href="/favicon.png">
<script>
// どこから来たか（X など）を、移った先の GA で数えられるように印をつける
(function(){var u="../?q=${q.id}",r="";try{r=new URL(document.referrer).hostname}catch(e){}
if(r&&r!==location.hostname)u+="&utm_source="+encodeURIComponent(r.replace(/^www\\./,""))+"&utm_medium=card";
location.replace(u+location.hash)})();
</script>
</head>
<body style="font-family:sans-serif;padding:24px">
<p><a href="../?q=${q.id}">「${esc(q.text)}」に答える</a></p>
</body>
</html>
`;
}

// カードの画像（ブラウザで描いて写す）
function cardHTML(q) {
  const n = q.choices.length, two = n > 3;
  const qsize = q.text.length > 26 ? 52 : q.text.length > 18 ? 60 : 68;
  const longest = Math.max(...q.choices.map((c) => c.length));
  const csize = two ? (longest > 10 ? 26 : 30) : (longest > 14 ? 30 : 34);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=RocknRoll+One&family=Zen+Kaku+Gothic+New:wght@700;900&display=swap">
<style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#eceef5;color:#1b2033;font-family:"Zen Kaku Gothic New",sans-serif;padding:52px 80px 46px;display:flex;flex-direction:column;gap:26px}
.brand{font-family:"RocknRoll One",sans-serif;font-size:34px;line-height:1}
.brand em{font-style:normal;color:#2f54eb}
.card{flex:1;background:#fff;border:2px solid #d3d7e6;border-radius:28px;padding:38px 46px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.q{font-weight:900;font-size:${qsize}px;line-height:1.3}
.ch{display:grid;grid-template-columns:${two ? '1fr 1fr' : '1fr'};gap:14px 22px}
.ch div{display:flex;align-items:center;gap:14px;border:2px solid #d3d7e6;border-radius:16px;padding:12px 18px;font-weight:700;font-size:${csize}px;line-height:1.25}
.ch i{width:20px;height:20px;border-radius:50%;flex:none}
.foot{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:28px;color:#5b6380}
.foot b{color:#2f54eb}
</style></head><body>
<div class="brand">みんなの<em>〇</em>択</div>
<div class="card"><div class="q">${esc(q.text)}</div>
<div class="ch">${q.choices.map((c, i) => `<div><i style="background:${COLORS[i % 6]}"></i>${esc(c)}</div>`).join('')}</div></div>
<div class="foot"><span>あなたは<b>どれ？</b> 答えると、みんなの割合が見られます</span><span>mataasobo.com</span></div>
</body></html>`;
}

const hashOf = (q) => crypto.createHash('sha1').update(q.text + '\n' + q.choices.join('\n')).digest('hex').slice(0, 12);

(async () => {
  const r = await fetch(API + '/questions?voter=cardmaker00000000');
  if (!r.ok) throw new Error('お題を読めませんでした ' + r.status);
  const data = await r.json();
  const questions = data.questions || data;
  fs.mkdirSync(OUT, { recursive: true });
  const listFile = path.join(OUT, 'cards.json');
  const done = fs.existsSync(listFile) ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : {};
  const todo = questions.filter((q) => ALL || done[q.id] !== hashOf(q) || !fs.existsSync(path.join(OUT, q.id + '.jpg')));
  console.log(`お題 ${questions.length}問・作る ${todo.length}問`);
  if (todo.length) {
    const b = await chromium.launch({ executablePath: CHROME });
    const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
    for (const q of todo) {
      await p.setContent(cardHTML(q), { waitUntil: 'networkidle' });
      // 字体の読みこみを待ってから、はみ出さなくなるまで、お題と選択肢の字を小さくする
      await p.evaluate(async () => {
        await Promise.all([document.fonts.load('34px "RocknRoll One"', 'みんなの〇択'), document.fonts.load('900 60px "Zen Kaku Gothic New"', 'あ')]);
        await document.fonts.ready;
        const q = document.querySelector('.q'), cs = [...document.querySelectorAll('.ch div')];
        const over = () => document.body.scrollHeight > 630 || document.querySelector('.foot').getBoundingClientRect().bottom > 630 - 30;
        let qs = parseFloat(getComputedStyle(q).fontSize), c = parseFloat(getComputedStyle(cs[0]).fontSize);
        for (let k = 0; k < 40 && over(); k++) {
          if (qs > 40) qs -= 3; else if (c > 22) c -= 2; else break;
          q.style.fontSize = qs + 'px'; cs.forEach((d) => { d.style.fontSize = c + 'px'; });
        }
      });
      await p.screenshot({ path: path.join(OUT, q.id + '.jpg'), type: 'jpeg', quality: 86 });
      fs.writeFileSync(path.join(OUT, q.id + '.html'), pageHTML(q));
      done[q.id] = hashOf(q);
      console.log('  ', q.id, q.text);
    }
    await b.close();
  }
  // 消えたお題（通報で隠れた など）のページと画像は消す
  const live = new Set(questions.map((q) => q.id));
  for (const f of fs.readdirSync(OUT)) {
    const id = f.replace(/\.(html|jpg)$/, '');
    if (f !== 'cards.json' && !live.has(id)) { fs.unlinkSync(path.join(OUT, f)); delete done[id]; console.log('  消した', f); }
  }
  fs.writeFileSync(listFile, JSON.stringify(done, null, 1));
  console.log('おわり。docs/q/ をコミットして push すると公開されます');
})().catch((e) => { console.error(e); process.exit(1); });
