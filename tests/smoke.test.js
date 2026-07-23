const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'LandingPage');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');

test('configura Laravel antes de cargar la aplicación', () => {
    assert.ok(html.indexOf('js/config.js') < html.indexOf('js/app.js'));
    assert.match(js, /window\.TGR_CONFIG/);
});

test('no usa handlers inline ni historial local ficticio', () => {
    assert.doesNotMatch(html + js, /\son(?:click|error)=/i);
    assert.doesNotMatch(js, /localStorage\.(?:setItem|getItem)\(['"]tgr_orders/i);
});

test('reservaciones están activas, funciones posteriores siguen ocultas y checkout es pagar al recoger', () => {
    assert.match(html, /id="subscriptions"[^>]*hidden/i);
    assert.match(html, /id="reservation"/i);
    assert.doesNotMatch(html, /id="reservation"[^>]*hidden/i);
    assert.match(js, /reservation-availability/);
    assert.match(js, /service_area_id/);
    assert.match(js, /Idempotency-Key/);
    const reservationForm = html.match(/<form[^>]*id="reservation-form"[\s\S]*?<\/form>/i)?.[0] || '';
    assert.match(reservationForm, /id="wrapper-area"/);
    assert.match(reservationForm, /id="reservation-availability-status"/);
    assert.match(js, /payment_method:\s*'pay_at_pickup'/);
    assert.doesNotMatch(html, /data-payment="(?:card|digital)"/i);
});

test('seguimiento y accesibilidad crítica están presentes', () => {
    assert.match(html, /id="btn-track-order"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /role="dialog"/);
});

test('el navegador no contiene cliente ni credenciales Supabase', () => {
    assert.doesNotMatch(html + js, /supabase-js|service_role|sb_secret_/i);
});

test('los datos comerciales están marcados como demo y existe aviso de privacidad', () => {
    assert.match(html, /Ambiente demostrativo/);
    assert.match(html, /href="privacy\.html"/);
    assert.match(privacy, /Aviso de privacidad — ambiente de pruebas/);
    assert.match(privacy, /No deben capturarse datos personales reales/);
});

test('el comprobante público abre impresión en formato térmico', () => {
    assert.match(js, /window\.onload\s*=\s*function\(\)\s*\{\s*window\.print\(\);/);
    assert.match(js, /@page \{ size: 80mm auto; margin: 4mm; \}/);
});

test('los complementos usan precio efectivo y selección predeterminada de Laravel', () => {
    assert.match(js, /addon\.effective_price \?\? addon\.price_adjustment/);
    assert.match(js, /addon\.selected_by_default \? 'checked' : ''/);
});
