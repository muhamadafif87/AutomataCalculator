class NFA:
    def __init__(self, states, alphabet, start_state, final_states, transitions):
        self.states = [s.strip() for s in states if s.strip()]
        self.alphabet = [a.strip() for a in alphabet if a.strip()]
        self.start_state = start_state.strip()
        self.final_states = [f.strip() for f in final_states if f.strip()]
        self.transitions = {}
        for k, v in transitions.items():
            if isinstance(v, list):
                self.transitions[k.strip()] = [x.strip() for x in v if x.strip()]
            elif isinstance(v, str) and v.strip() and v.strip() != '∅':
                self.transitions[k.strip()] = [v.strip()]

    def epsilon_closure(self, start_states):
        closure = set(start_states)
        stack = list(start_states)
        while stack:
            s = stack.pop()
            eps_targets = self.transitions.get(f"{s}|||ε")
            if eps_targets:
                for t in eps_targets:
                    if t not in closure:
                        closure.add(t)
                        stack.append(t)
        return closure

    def move(self, states, symbol):
        moved = set()
        for s in states:
            targets = self.transitions.get(f"{s}|||{symbol}")
            if targets:
                for t in targets:
                    moved.add(t)
        return moved

    def test_string(self, input_str):
        raw = input_str.strip()
        symbols = list(raw) # NFAs from regex typically match single characters

        current_set = self.epsilon_closure([self.start_state])
        
        for sym in symbols:
            moved_set = self.move(current_set, sym)
            current_set = self.epsilon_closure(moved_set)

        accepted = any(s in self.final_states for s in current_set)
        return accepted, sorted(list(current_set))
