/* Nata Kapitos — каркас магазину. Дані: data/products.js (window.PRODUCTS) */
(function () {
  'use strict';

  var SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  var P = window.PRODUCTS || [];

  /* ===== Налаштування надсилання замовлень =====
     Email (рекомендовано): зареєструйтесь на web3forms.com, отримайте безкоштовний
     Access Key і вставте його нижче — замовлення падатимуть вам на пошту.
     Telegram (опційно): створіть бота через @BotFather, візьміть токен; chatId —
     ваш id від @userinfobot. Увага: токен буде видно у коді сайту. */
  var NK_CONFIG = {
    web3formsKey: '',
    orderEmailSubject: 'Нове замовлення — Nata Kapitos',
    telegram: { token: '', chatId: '' }
  };


  /* ---------- дрібні помічники ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(n) { return n.toLocaleString('uk-UA') + ' грн'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function byId(sku) { for (var i = 0; i < P.length; i++) if (P[i].sku === sku) return P[i]; return null; }
  function inStock(p) { return p.sizes.some(function (s) { return s.qty > 0; }); }
  function ph(cls, label) { return '<div class="ph ' + cls + '">' + esc(label) + '</div>'; }

  // Фото товару: <img> з фолбеком на плейсхолдер, якщо файлу немає
  function pimg(sku, n, cls, alt) {
    var src = 'assets/photos/' + sku + '-' + n + '.webp';
    var fb = "this.onerror=null;this.parentNode.innerHTML='" +
             "<div class=\\'ph " + cls + "\\'>" + esc(sku + ' · фото ' + n) + "</div>'";
    return '<div class="imgwrap ' + cls + '">' +
      '<img src="' + src + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="' + fb + '">' +
      '</div>';
  }

  /* ---------- кошик ---------- */
  var KEY = 'nk_cart_v1';
  function cartRead() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return window.__cart || []; }
  }
  function cartWrite(c) {
    window.__cart = c;
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* приватний режим */ }
    paintCount();
  }
  function cartAdd(sku, size) {
    var c = cartRead();
    if (!c.some(function (i) { return i.sku === sku && i.size === size; })) c.push({ sku: sku, size: size });
    cartWrite(c);
  }
  function cartRemove(i) { var c = cartRead(); c.splice(i, 1); cartWrite(c); }
  function cartTotal() {
    return cartRead().reduce(function (s, i) { var p = byId(i.sku); return s + (p ? p.price : 0); }, 0);
  }
  function paintCount() {
    var n = cartRead().length;
    $$('.cart-count').forEach(function (el) {
      el.textContent = n; el.style.display = n ? 'inline-block' : 'none';
    });
  }

  /* ---------- картка товару в сітці ---------- */
  function cardHTML(p) {
    var sizes = p.sizes.map(function (s) {
      return '<span class="sz' + (s.qty > 0 ? '' : ' out') + '">' + esc(s.size) + '</span>';
    }).join('');
    var left = p.sizes.reduce(function (a, s) { return a + s.qty; }, 0);
    var badge = left === 0
      ? '<span class="badge low">Немає в наявності</span>'
      : (left <= 2 ? '<span class="badge low">Залишилось ' + left + '</span>'
                   : '<span class="badge ok">В наявності</span>');
    return '<a class="card" href="product.html?sku=' + encodeURIComponent(p.sku) + '">' +
      pimg(p.sku, 1, 'card-img', p.name) +
      '<div class="card-b">' + badge +
      '<span class="card-name">' + esc(p.name) + '</span>' +
      '<span class="card-price">' + money(p.price) + '</span>' +
      '<span class="sizes-line">' + sizes + '</span>' +
      '</div></a>';
  }

  /* ---------- головна ---------- */
  function initHome() {
    var box = $('#featured'); if (!box) return;
    var list = P.filter(function (p) { return p.featured; }).slice(0, 4);
    box.innerHTML = list.map(cardHTML).join('');
    ['Весільні', 'Вечірні', 'Корсети'].forEach(function (c) {
      var el = $('#count-' + translit(c));
      if (el) el.textContent = P.filter(function (p) { return p.category === c; }).length;
    });
  }
  function translit(c) {
    return { 'Весільні': 'wed', 'Вечірні': 'eve', 'Корсети': 'cor' }[c] || c;
  }

  /* ---------- каталог ---------- */
  function initCatalog() {
    var grid = $('#catalog-grid'); if (!grid) return;
    var params = new URLSearchParams(location.search);
    var preset = params.get('cat');
    if (preset) {
      var box = $$('.f-cat').filter(function (i) { return i.value === preset; })[0];
      if (box) box.checked = true;
    }

    function chosen(cls) {
      return $$(cls).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    }

    function render() {
      var cats = chosen('.f-cat'), szs = chosen('.f-size'), sil = chosen('.f-sil');
      var maxPrice = parseInt($('#f-price').value, 10);
      var onlyStock = $('#f-stock').checked;
      $('#price-label').textContent = 'до ' + money(maxPrice);

      var res = P.filter(function (p) {
        if (cats.length && cats.indexOf(p.category) < 0) return false;
        if (sil.length && sil.indexOf(p.silhouette) < 0) return false;
        if (p.price > maxPrice) return false;
        if (onlyStock && !inStock(p)) return false;
        if (szs.length && !p.sizes.some(function (s) {
          return szs.indexOf(s.size) >= 0 && s.qty > 0; })) return false;
        return true;
      });

      var sort = $('#f-sort').value;
      res.sort(function (a, b) {
        if (sort === 'price-asc') return a.price - b.price;
        if (sort === 'price-desc') return b.price - a.price;
        return Number(inStock(b)) - Number(inStock(a));
      });

      $('#result-count').textContent = res.length ? plural(res.length) : '';
      grid.innerHTML = res.length ? res.map(cardHTML).join('')
        : '<div class="empty" style="grid-column:1/-1">За цими фільтрами нічого немає.' +
          ' Спробуйте зняти обмеження по розміру або ціні.</div>';
    }

    function plural(n) {
      var t = n % 10, h = n % 100;
      var w = (t === 1 && h !== 11) ? 'модель' :
              (t >= 2 && t <= 4 && (h < 12 || h > 14)) ? 'моделі' : 'моделей';
      return n + ' ' + w;
    }

    $$('.f-cat,.f-size,.f-sil,#f-stock').forEach(function (i) { i.addEventListener('change', render); });
    $('#f-price').addEventListener('input', render);
    $('#f-sort').addEventListener('change', render);
    $('#f-reset').addEventListener('click', function () {
      $$('.f-cat,.f-size,.f-sil').forEach(function (i) { i.checked = false; });
      $('#f-stock').checked = false;
      $('#f-price').value = $('#f-price').max;
      $('#f-sort').value = 'default';
      render();
    });
    render();
  }

  /* ---------- сторінка товару ---------- */
  function initProduct() {
    var root = $('#product'); if (!root) return;
    var sku = new URLSearchParams(location.search).get('sku');
    var p = byId(sku) || P[0];
    if (!p) { root.innerHTML = '<div class="empty">Товар не знайдено.</div>'; return; }
    document.title = p.name + ' — Nata Kapitos';

    var chosenSize = null;
    var firstAvail = p.sizes.filter(function (s) { return s.qty > 0; })[0];
    if (firstAvail) chosenSize = firstAvail.size;

    $('#crumb-cat').textContent = p.category;
    $('#crumb-cat').href = 'catalog.html?cat=' + encodeURIComponent(p.category);
    $('#crumb-name').textContent = p.name;

    var thumbs = [];
    for (var i = 1; i <= p.photos; i++) thumbs.push(i);

    root.innerHTML =
      '<div>' +
        '<div id="gal-main">' + pimg(p.sku, 1, 'gal-main', p.name) + '</div>' +
        '<div class="gal-thumbs">' + thumbs.map(function (n) {
          return '<div class="thumb' + (n === 1 ? ' sel' : '') + '" data-n="' + n + '">' +
            pimg(p.sku, n, 'thumb-img', p.name + ' фото ' + n) + '</div>';
        }).join('') + '</div>' +
      '</div>' +
      '<div>' +
        '<h1>' + esc(p.name) + '</h1>' +
        '<div class="pd-sku">Артикул ' + esc(p.sku) + ' · ' + esc(p.category.toLowerCase()) +
          ' · силует «' + esc(p.silhouette.toLowerCase()) + '» · ' + esc(p.color.toLowerCase()) + '</div>' +
        '<div class="pd-price">' + money(p.price) + '</div>' +
        '<div class="stock ' + (inStock(p) ? 'ok' : 'no') + '" id="stockline"></div>' +
        '<div class="pick-head"><span>Розмір</span>' +
          '<a href="sizes.html">Як визначити свій розмір</a></div>' +
        '<div class="szpick" id="szpick"></div>' +
        '<div class="meas" id="meas"></div>' +
        '<div class="buyrow">' +
          '<button class="btn" id="add">Додати в кошик</button>' +
          '<a class="btn ghost" id="fitting" href="https://www.instagram.com/natakapitos/" target="_blank" rel="noopener">Замовити примірку</a>' +
        '</div>' +
        '<div id="added" class="small" style="display:none;margin-bottom:16px;color:var(--ok)">' +
          'Додано в кошик. <a href="cart.html">Перейти до оформлення</a></div>' +
        '<div class="assur">' +
          '<div>Нова Пошта, оплата при отриманні</div>' +
          '<div>Примірка у відділенні перед оплатою</div>' +
          '<div>Обмін розміру протягом 14 днів</div>' +
        '</div>' +
      '</div>';

    var det = $('#details');
    det.innerHTML =
      block('Опис', esc(p.description)) +
      block('Тканина і склад', esc(p.fabric)) +
      block('Догляд за виробом', esc(p.care)) +
      block('Доставка, обмін і повернення',
        'Відправка з Ужгорода Новою Поштою наступного робочого дня після замовлення. ' +
        'Оплата при отриманні. У відділенні сукню можна оглянути й поміряти до оплати. ' +
        'Якщо розмір не підійшов — обмін протягом 14 днів, докладніше на сторінці ' +
        '<a href="info.html">Доставка й обмін</a>.');

    function block(t, b) {
      return '<details><summary>' + t + '</summary><div class="dbody">' + b + '</div></details>';
    }

    function paintSizes() {
      $('#szpick').innerHTML = p.sizes.map(function (s) {
        return '<button type="button" data-size="' + s.size + '"' +
          (s.qty > 0 ? '' : ' disabled') +
          ' aria-pressed="' + (s.size === chosenSize) + '">' + s.size + '</button>';
      }).join('');
      $$('#szpick button').forEach(function (b) {
        b.addEventListener('click', function () { chosenSize = b.dataset.size; paintSizes(); });
      });
      paintMeas();
    }

    function paintMeas() {
      var s = p.sizes.filter(function (x) { return x.size === chosenSize; })[0] || p.sizes[0];
      var rows = [['Обхват грудей', s.bust], ['Обхват талії', s.waist]];
      if (s.hips) rows.push(['Обхват стегон', s.hips]);
      rows.push(['Довжина виробу', s.length]);
      if (s.sleeve) rows.push(['Довжина рукава', s.sleeve]);

      var cells = '';
      for (var i = 0; i < rows.length; i += 2) {
        cells += '<tr><td>' + rows[i][0] + '</td><td>' + rows[i][1] + ' см</td>' +
          (rows[i + 1] ? '<td>' + rows[i + 1][0] + '</td><td>' + rows[i + 1][1] + ' см</td>'
                       : '<td></td><td></td>') + '</tr>';
      }
      $('#meas').innerHTML =
        '<h4>Заміри виробу, розмір ' + esc(s.size) + '</h4>' +
        '<table>' + cells + '</table>' +
        (s.note ? '<div class="model">' + esc(s.note) + '</div>' : '') +
        '<div class="model">На фото: зріст ' + p.modelHeight + ' см, розмір ' + esc(p.modelSize) + '</div>';

      var left = p.sizes.reduce(function (a, x) { return a + x.qty; }, 0);
      $('#stockline').textContent = left
        ? 'В наявності, відправка наступного робочого дня'
        : 'Зараз немає в наявності';
      $('#add').disabled = !left;

    }

    $$('.gal-thumbs .thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        $$('.gal-thumbs .thumb').forEach(function (x) { x.classList.remove('sel'); });
        t.classList.add('sel');
        $('#gal-main').innerHTML = pimg(p.sku, t.dataset.n, 'gal-main', p.name);
      });
    });

    paintSizes();
    $('#add').addEventListener('click', function () {
      if (!chosenSize) return;
      cartAdd(p.sku, chosenSize);
      $('#added').style.display = 'block';
    });

    var rel = $('#related');
    if (rel) {
      rel.innerHTML = P.filter(function (x) {
        return x.category === p.category && x.sku !== p.sku;
      }).slice(0, 4).map(cardHTML).join('');
    }
  }

  /* ---------- кошик ---------- */
  function initCart() {
    var wrap = $('#cart-items'); if (!wrap) return;

    function render() {
      var c = cartRead();
      if (!c.length) {
        $('#cart-body').innerHTML =
          '<div class="empty">У кошику порожньо. <a href="catalog.html">Подивитись каталог</a></div>';
        return;
      }
      wrap.innerHTML = c.map(function (it, idx) {
        var p = byId(it.sku); if (!p) return '';
        return '<div class="cartrow">' + pimg(p.sku, 1, 'cart-img', p.name) +
          '<div><div class="card-name">' + esc(p.name) + '</div>' +
          '<div class="small muted">Артикул ' + esc(p.sku) + ' · розмір ' + esc(it.size) + '</div>' +
          '<button class="linkbtn" data-i="' + idx + '">Прибрати</button></div>' +
          '<div>' + money(p.price) + '</div></div>';
      }).join('');
      $$('#cart-items .linkbtn').forEach(function (b) {
        b.addEventListener('click', function () { cartRemove(+b.dataset.i); render(); });
      });
      $('#sum-goods').textContent = money(cartTotal());
      $('#sum-total').textContent = money(cartTotal());
    }

    $('#order-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var c = cartRead();
      if (!c.length) return;
      var lines = c.map(function (it) {
        var p = byId(it.sku);
        return '· ' + p.name + ' (' + p.sku + '), розмір ' + it.size + ' — ' + money(p.price);
      }).join('\n');
      var txt = 'Замовлення з сайту\n\n' + lines + '\n\nРазом: ' + money(cartTotal()) +
        '\n\nІмʼя: ' + f.fio.value + '\nТелефон: ' + f.phone.value +
        '\nМісто: ' + f.city.value + '\nВідділення НП: ' + f.branch.value +
        (f.comment.value ? '\nКоментар: ' + f.comment.value : '');
      var btn = f.querySelector('button[type=submit]');

      function done(sent) {
        $('#cart-body').innerHTML =
          '<div class="panel"><h2>' + (sent ? 'Дякуємо! Замовлення прийнято' : 'Замовлення сформовано') + '</h2>' +
          '<p class="muted small">' + (sent
            ? 'Ми звʼяжемося з вами найближчим часом, щоб підтвердити розмір і деталі. Оплата — при отриманні у відділенні Нової Пошти.'
            : 'Надсилання ще не підключено. Скопіюйте текст нижче й надішліть нам у Instagram або по телефону — ми оформимо замовлення.') + '</p>' +
          (sent ? '' : '<pre>' + esc(txt) + '</pre>') +
          '<a class="btn" href="catalog.html" style="margin-top:8px">Повернутись у каталог</a></div>';
        cartWrite([]);
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }

      var pending = [], sent = false;
      if (NK_CONFIG.web3formsKey) {
        pending.push(fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: NK_CONFIG.web3formsKey,
            subject: NK_CONFIG.orderEmailSubject,
            from_name: 'Сайт Nata Kapitos',
            name: f.fio.value, phone: f.phone.value, city: f.city.value,
            branch: f.branch.value, comment: f.comment.value,
            total: money(cartTotal()), message: txt
          })
        }).then(function (r) { return r.ok; }).then(function (ok) { if (ok) sent = true; }).catch(function () {}));
      }
      if (NK_CONFIG.telegram.token && NK_CONFIG.telegram.chatId) {
        var turl = 'https://api.telegram.org/bot' + NK_CONFIG.telegram.token +
          '/sendMessage?chat_id=' + encodeURIComponent(NK_CONFIG.telegram.chatId) +
          '&text=' + encodeURIComponent(txt);
        pending.push(fetch(turl).then(function (r) { return r.ok; }).then(function (ok) { if (ok) sent = true; }).catch(function () {}));
      }
      if (!pending.length) { done(false); return; }
      Promise.all(pending).then(function () { done(sent); });
    });

    render();
  }

  /* ---------- меню на мобільному ---------- */
  function initNav() {
    var b = $('.burger'); if (!b) return;
    b.addEventListener('click', function () {
      var n = $('nav');
      var open = n.classList.toggle('open');
      b.setAttribute('aria-expanded', open);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    paintCount(); initNav(); initHome(); initCatalog(); initProduct(); initCart();
  });
})();
