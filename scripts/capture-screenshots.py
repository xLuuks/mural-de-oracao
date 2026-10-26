"""Capture the actual UI with synthetic data and no Firebase connection."""
import functools
import http.server
import json
from pathlib import Path
import re
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    output = ROOT / 'docs' / 'screenshots'
    output.mkdir(parents=True, exist_ok=True)
    fixture = (ROOT / 'scripts/fixtures/mural-demo.js').read_text(encoding='utf-8')
    source = (ROOT / 'script.js').read_text(encoding='utf-8')
    uid = re.search(r"const ADMIN_UID = '([^']+)'", source).group(1)
    fixture = fixture.replace('__ADMIN_UID__', uid)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    findings = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1, timezone_id='America/Sao_Paulo', reduced_motion='reduce')
            context.route('https://www.gstatic.com/firebasejs/**', lambda route: route.fulfill(content_type='application/javascript', body=fixture if route.request.url.endswith('firebase-app-compat.js') else ''))
            context.route(re.compile(r'https://[^/]*(googleapis\.com|firebaseapp\.com|firebaseio\.com)/.*'), lambda route: route.continue_() if 'fonts.googleapis.com' in route.request.url else route.abort())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='networkidle')
            page.select_option('#filterYear', '2026')
            page.select_option('#filterMonth', '10')
            assert page.locator('#listaPedidos .card').count() == 3
            page.locator('#filterShowAll').click()
            assert page.locator('#listaPedidos .card').count() == 4
            assert page.locator('#filterMonth').is_disabled()
            page.locator('#filterShowAll').click()
            page.select_option('#filterMonth', '1')
            assert page.locator('.mural-empty').is_visible()
            page.select_option('#filterMonth', '10')
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(output / 'mural-desktop.png'), full_page=True)

            page.locator('#toggleForm').click()
            page.fill('#nome', 'Aluno (demonstração)')
            page.fill('#cidade', 'Manaus')
            page.fill('#pedido', 'Peço oração pela nossa turma, por sabedoria nos estudos e por oportunidades de servir à comunidade.')
            page.locator('label').filter(has=page.locator('input[name="cor"][value="#c8e6c9"]')).click()
            page.locator('label').filter(has=page.locator('input[name="pinModelo"][value="pin1"]')).click()
            page.locator('label').filter(has=page.locator('input[name="pinCor"][value="azul"]')).click()
            page.screenshot(path=str(output / 'formulario-desktop.png'), full_page=True)
            page.fill('#pedido', '')
            page.locator('#toggleForm').click()

            page.evaluate('__demo.admin(); atualizarModoAdminUI(); carregarPedidos(); renderAdminUpdatesPanel()')
            page.locator('#adminUpdatesToggle').click()
            assert page.locator('#adminUpdatesBadge').inner_text() == '1'
            page.screenshot(path=str(output / 'atualizacoes-admin.png'), full_page=True)
            page.locator('.admin-updates__close').click()

            # A realtime insertion must not retarget an already-open deletion modal.
            page.evaluate("abrirModalExcluir(0); __demo.rows.unshift({id:'demo-inserted',data:{...__demo.rows[0].data,createdAt:{toDate:()=>new Date(2026,9,25)}}}); __demo.emit()")
            page.locator('#modalExcluirConfirmar').click()
            page.wait_for_function('__demo.writes.length > 0')
            findings['delete_modal_target_after_realtime_insert'] = page.evaluate('__demo.writes.at(-1).id')
            page.evaluate('__demo.rows.shift(); __demo.emit(); firebase.auth().currentUser = null; atualizarModoAdminUI(); carregarPedidos(); renderAdminUpdatesPanel()')

            page.evaluate("document.getElementById('pedido').value='   '; form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))")
            findings['submit_disabled_after_whitespace'] = page.locator('#btnEnviarPedido').is_disabled()
            page.evaluate("document.getElementById('pedido').value=''")

            page.set_viewport_size({'width': 390, 'height': 844})
            for close_button in page.locator('.toast-close').all():
                close_button.click()
            page.wait_for_load_state('networkidle')
            page.evaluate('window.scrollTo(0,0)')
            findings['mobile_horizontal_overflow'] = page.evaluate('document.documentElement.scrollWidth > innerWidth')
            page.screenshot(path=str(output / 'mural-mobile.png'), full_page=True)
            findings['page_errors'] = errors
            assert not errors, errors
            print(json.dumps(findings, ensure_ascii=True, indent=2))
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
