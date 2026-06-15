import os
import webbrowser
from threading import Timer
from flask import Flask, render_template, request, jsonify
from automata import DFA, NFA, check_equivalence, tokenize_regex, regex_to_postfix, build_nfa_from_postfix

app = Flask(__name__)

# Routing halaman utama
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint: Simulasi DFA
@app.route('/api/dfa/test', methods=['POST'])
def api_test_dfa():
    try:
        data = request.json
        states = data.get('states', [])
        alpha = data.get('alpha', [])
        start = data.get('start', '')
        finals = data.get('finals', [])
        trans = data.get('trans', {})
        input_str = data.get('input_str', '')

        # Proses instansiasi DFA dan uji string
        dfa = DFA(states, alpha, start, finals, trans)
        accepted, trace, final_state = dfa.test_string(input_str)

        return jsonify({
            'success': True,
            'accepted': accepted,
            'trace': trace,
            'final_state': final_state
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

# Endpoint: Simulasi NFA
@app.route('/api/nfa/test', methods=['POST'])
def api_test_nfa():
    try:
        data = request.json
        states = data.get('states', [])
        alpha = data.get('alpha', [])
        start = data.get('start', '')
        finals = data.get('finals', [])
        trans = data.get('trans', {})
        input_str = data.get('input_str', '')

        nfa = NFA(states, alpha, start, finals, trans)
        accepted, final_set = nfa.test_string(input_str)

        return jsonify({
            'success': True,
            'accepted': accepted,
            'final_set': final_set
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

# Endpoint: Konversi Regex ke NFA Thompson
@app.route('/api/regex/to-nfa', methods=['POST'])
def api_regex_to_nfa():
    try:
        data = request.json
        regex = data.get('regex', '').strip()

        if not regex:
            return jsonify({
                'success': False,
                'message': 'Regex tidak boleh kosong'
            }), 400

        tokens = tokenize_regex(regex)
        postfix = regex_to_postfix(tokens)
        nfa_result = build_nfa_from_postfix(postfix)

        return jsonify({
            'success': True,
            'nfa': nfa_result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"Gagal memproses regex: {str(e)}"
        }), 400

# Endpoint: Minimisasi DFA
@app.route('/api/dfa/minimize', methods=['POST'])
def api_minimize_dfa():
    try:
        data = request.json
        states = data.get('states', [])
        alpha = data.get('alpha', [])
        start = data.get('start', '')
        finals = data.get('finals', [])
        trans = data.get('trans', {})

        dfa = DFA(states, alpha, start, finals, trans)
        minimized = dfa.minimize()

        return jsonify({
            'success': True,
            'minimized': minimized
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

# Endpoint: Cek Ekuivalensi DFA
@app.route('/api/dfa/equivalence', methods=['POST'])
def api_check_equivalence():
    try:
        data = request.json
        d1 = data.get('dfa1', {})
        d2 = data.get('dfa2', {})

        dfa1 = DFA(d1.get('states', []), d1.get('alpha', []), d1.get('start', ''), d1.get('finals', []), d1.get('trans', {}))
        dfa2 = DFA(d2.get('states', []), d2.get('alpha', []), d2.get('start', ''), d2.get('finals', []), d2.get('trans', {}))

        equivalent, counterexample = check_equivalence(dfa1, dfa2)

        return jsonify({
            'success': True,
            'equivalent': equivalent,
            'counterexample': counterexample
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/")

if __name__ == '__main__':

    # buat buka browser otomatis
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        Timer(1.0, open_browser).start()
    elif not os.environ.get("FLASK_DEBUG") and not os.environ.get("WERKZEUG_RUN_MAIN"):
        Timer(1.0, open_browser).start()
        
    app.run(host='127.0.0.1', port=5000, debug=True)
