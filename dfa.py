# LOGIKA MESIN DFA
class DFA:
    def __init__(self, states, alphabet, start_state, final_states, transitions):
        self.states = [s.strip() for s in states if s.strip()]
        self.alphabet = [a.strip() for a in alphabet if a.strip()]
        self.start_state = start_state.strip()
        self.final_states = [f.strip() for f in final_states if f.strip()]
        self.transitions = {k.strip(): v.strip() for k, v in transitions.items() if v.strip()}

    def test_string(self, input_str):
        raw = input_str.strip()
        # Pecah string masukan menjadi simbol-simbol transisi
        if ' ' in raw:
            symbols = [s for s in raw.split(' ') if s]
        else:
            symbols = list(raw)

        current = self.start_state
        trace = []
        ok = True
        trace.append({
            'state': current,
            'info': f"Start: {current}",
            'type': 'info'
        })

        for sym in symbols:
            if sym not in self.alphabet:
                ok = False
                trace.append({
                    'state': None,
                    'info': f"'{sym}' tidak ada di alphabet",
                    'type': 'fail'
                })
                break
            
            key = f"{current}|||{sym}"
            next_state = self.transitions.get(key)
            if not next_state or next_state not in self.states:
                ok = False
                trace.append({
                    'state': '∅',
                    'info': f"δ({current}, {sym}) = ∅ — tidak ada transisi",
                    'type': 'fail'
                })
                break
            
            trace.append({
                'state': next_state,
                'info': f"δ({current}, {sym}) = {next_state}",
                'type': 'ok'
            })
            current = next_state

        accepted = ok and (current in self.final_states)
        return accepted, trace, current

    def minimize(self):
        # Impor lokal untuk mencegah circular import
        from minimizer import minimize_dfa
        return minimize_dfa(self)
