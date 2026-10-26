"""Browser regression checks with a local Firebase substitute."""
import functools
import http.server
from pathlib import Path
import re
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))
from playwright.sync_api import sync_playwright, expect


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    fixture = (ROOT / 'scripts/fixtures/mural-demo.js').read_text(encoding='utf-8')
    uid = re.search(r"const ADMIN_UID = '([^']+)'", (ROOT / 'script.js').read_text(encoding='utf-8')).group(1)
    fixture = fixture.replace('__ADMIN_UID__', uid)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    passed = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            context = browser.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Sao_Paulo', reduced_motion='reduce')
            context.route('https://www.gstatic.com/firebasejs/**', lambda route: route.fulfill(content_type='application/javascript', body=fixture if route.request.url.endswith('firebase-app-compat.js') else ''))
            context.route(re.compile(r'https://[^/]*(googleapis\.com|firebaseapp\.com|firebaseio\.com)/.*'), lambda route: route.abort())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def reset():
                page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='networkidle')
                expect(page.locator('#listaPedidos .card')).to_have_count(4)
                expect(page.locator('#filterSummary')).to_contain_text('todos os pedidos')
                expect(page.locator('.footer-credit a')).to_have_text('Luks Alves')
                expect(page.locator('.footer-credit a')).to_have_attribute('href', 'https://github.com/xLuuks')
                page.select_option('#filterYear', '2026')
                page.select_option('#filterMonth', '10')
                expect(page.locator('#listaPedidos .card')).to_have_count(3)

            def submit_prayer():
                page.locator('#modalOrarForm').evaluate("el => el.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}))")
                expect(page.locator('#modalOrar')).to_be_hidden()

            reset()
            expect(page.locator('#modalUpdate')).to_have_count(0)
            assert page.evaluate("__demo.listeners.filter(l=>l.active && l.name==='updates').length") == 0
            page.locator('[data-id="demo-estudos"] .btn-intercessores').click()
            expect(page.locator('[data-id="demo-estudos"]')).to_have_class(re.compile('is-flipped'))
            expect(page.get_by_role('button', name='Enviar atualização')).to_have_count(0)
            page.evaluate('__demo.admin()')
            expect(page.locator('#admin-section')).to_be_visible()
            expect(page.locator('#form-section')).to_be_hidden()
            expect(page.locator('#filter-section')).to_be_hidden()
            expect(page.locator('#mural')).to_be_hidden()
            expect(page.locator('.admin-pedido')).to_have_count(4)
            assert page.evaluate("__demo.listeners.filter(l=>l.active && l.name==='updates').length") == 0
            editor = page.locator('.admin-pedido[data-id="demo-estudos"]')
            editor.locator('[name="nome"]').fill('Nome editado')
            editor.locator('[name="cidade"]').fill('Cidade editada')
            editor.locator('[name="texto"]').fill('Pedido editado pelo administrador')
            page.evaluate('__demo.emit()')
            expect(editor.locator('[name="texto"]')).to_have_value('Pedido editado pelo administrador')
            expect(editor.locator('[name="texto"]')).to_be_focused()
            editor.locator('button[type="submit"]').click()
            expect(editor.locator('.admin-pedido__feedback')).to_have_text('Alterações salvas')
            assert page.evaluate("__demo.rows.find(r=>r.id==='demo-estudos').data.nome") == 'Nome editado'
            assert page.evaluate("__demo.rows.find(r=>r.id==='demo-estudos').data.texto") == 'Pedido editado pelo administrador'
            finished = page.locator('.admin-pedido[data-id="demo-gratidao"]')
            expect(finished.locator('[name="texto"]')).to_be_editable()
            expect(finished.locator('.admin-pedido__finalizar')).to_be_disabled()
            page.locator('.admin-pedido[data-id="demo-comunidade"] .admin-pedido__finalizar').click()
            page.locator('#modalFinalizarConfirmar').click()
            expect(page.locator('.admin-pedido[data-id="demo-comunidade"] .admin-pedido__status')).to_have_text('Finalizado')
            page.evaluate("__demo.fail('pedidos')")
            page.locator('#adminPedidosList button', has_text='Tentar novamente').click()
            expect(page.locator('.admin-pedido')).to_have_count(4)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            page.screenshot(path=str(ROOT / '.tools/admin-mobile.png'), full_page=True)
            page.set_viewport_size({'width': 1280, 'height': 900})
            page.screenshot(path=str(ROOT / '.tools/admin-desktop.png'), full_page=True)
            page.evaluate('__demo.logout()')
            expect(page.locator('#admin-section')).to_be_hidden()
            expect(page.locator('.admin-pedido')).to_have_count(0)
            expect(page.locator('#listaPedidos .card')).to_have_count(3)
            page.evaluate('__demo.admin()')
            expect(page.locator('.admin-pedido')).to_have_count(4)
            passed.append('public actions, complete admin view, inline save, realtime drafts, finalize, retry and logout')

            page.evaluate("abrirModalExcluir('demo-estudos'); __demo.rows.unshift({id:'demo-inserted',data:{...__demo.rows[0].data,createdAt:{toDate:()=>new Date(2026,9,25)}}}); __demo.emit()")
            page.locator('#modalExcluirConfirmar').click()
            expect(page.locator('#modalExcluir')).to_be_hidden()
            assert page.evaluate('__demo.writes.at(-1).id') == 'demo-estudos'
            assert page.evaluate("__demo.rows.some(r=>r.id==='demo-inserted')")
            passed.append('deletion retains document ID after realtime insertion')

            reset()
            page.locator('[data-id="demo-estudos"] .card-front .btn-acao').click()
            page.evaluate("__demo.rows.unshift({id:'demo-inserted',data:{...__demo.rows[0].data,createdAt:{toDate:()=>new Date(2026,9,25)}}}); __demo.emit()")
            page.select_option('#filterMonth', '9')
            page.fill('#modalNome', 'Clara')
            submit_prayer()
            assert page.evaluate('__demo.writes.at(-1).id') == 'demo-estudos'
            assert page.evaluate("__demo.rows.find(r=>r.id==='demo-estudos').data.intercessores.filter(n=>n==='Clara').length") == 2
            page.select_option('#filterMonth', '10')
            expect(page.locator('[data-id="demo-estudos"] .contador-oracoes')).to_have_text('4')
            passed.append('prayer retains ID across realtime insertion and filter change; duplicate names preserved')

            page.evaluate("abrirModalOrar('demo-estudos')")
            writes = page.evaluate('__demo.writes.length')
            submit_prayer()
            assert page.evaluate('__demo.writes.length') == writes
            passed.append('same local identity cannot register twice')

            reset()
            page.evaluate("abrirModalOrar('demo-estudos'); __demo.rows.find(r=>r.id==='demo-estudos').data.status='finalizado'")
            submit_prayer()
            assert page.evaluate('__demo.writes.length') == 0
            page.evaluate("abrirModalOrar('demo-comunidade'); __demo.rows.splice(__demo.rows.findIndex(r=>r.id==='demo-comunidade'),1)")
            submit_prayer()
            assert page.evaluate('__demo.writes.length') == 0
            passed.append('finalized and deleted requests reject prayer at confirmation')

            reset()
            page.locator('#toggleForm').click()
            page.fill('#pedido', '   ')
            page.locator('#pedidoForm').evaluate("el=>el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))")
            expect(page.locator('#btnEnviarPedido')).to_be_enabled()
            expect(page.locator('#btnEnviarPedidoMobile')).to_be_enabled()
            assert page.evaluate('__demo.writes.length') == 0
            passed.append('whitespace validation leaves both submit buttons enabled')

            page.evaluate("""() => {
                window.originalCollection = db.collection;
                window.addCalls = 0;
                db.collection = name => {
                    const q = originalCollection(name);
                    q.add = () => { addCalls++; return new Promise((resolve,reject) => { window.rejectAdd = reject; }); };
                    return q;
                };
                document.getElementById('pedido').value = 'Pedido de teste';
                for(let i=0;i<2;i++) form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
            }""")
            assert page.evaluate('addCalls') == 1
            expect(page.locator('#btnEnviarPedido')).to_be_disabled()
            page.evaluate("rejectAdd(new Error('simulated write failure'))")
            expect(page.locator('#btnEnviarPedido')).to_be_enabled()
            expect(page.locator('#btnEnviarPedidoMobile')).to_be_enabled()
            page.evaluate('db.collection = originalCollection')
            passed.append('duplicate submissions blocked and buttons restored after write failure')


            page.evaluate("__demo.fail('pedidos')")
            expect(page.locator('#listaPedidos')).to_contain_text('Não foi possível carregar')
            page.locator('#listaPedidos button', has_text='Tentar novamente').click()
            expect(page.locator('#listaPedidos .card')).to_have_count(3)
            page.evaluate("__demo.listeners.find(l=>l.name==='pedidos').callback({docs:[]})")
            expect(page.locator('#listaPedidos .card')).to_have_count(3)
            page.locator('#filterShowAll').click()
            expect(page.locator('#listaPedidos .card')).to_have_count(4)
            page.locator('#filterShowAll').click()
            page.select_option('#filterMonth', '1')
            expect(page.locator('#listaPedidos')).to_contain_text('Nenhum pedido encontrado')
            passed.append('query error/retry, show all, monthly filter and empty state')

            page.set_viewport_size({'width': 390, 'height': 844})
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            assert not errors, errors
            passed.append('mobile layout and no unhandled JavaScript errors')
            for result in passed:
                print('PASS:', result)
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
