class ThompsonStateCounter:
    def __init__(self):
        self.count = 0
    def new_state(self):
        s = f"q{self.count}"
        self.count += 1
        return s

def tokenize_regex(regex):
    tokens = []
    for c in regex:
        if c == 'ε':
            tokens.append({'type': 'CHAR', 'val': 'ε'})
        elif c == '/':
            tokens.append({'type': '|', 'val': '|'})
        elif c in '()|*+':
            tokens.append({'type': c, 'val': c})
        else:
            tokens.append({'type': 'CHAR', 'val': c})

    out = []
    for j in range(len(tokens)):
        out.append(tokens[j])
        if j + 1 < len(tokens):
            cur = tokens[j]
            nxt = tokens[j + 1]
            after = cur['type'] in ('CHAR', '*', '+', ')')
            before = nxt['type'] in ('CHAR', '(')
            if after and before:
                out.append({'type': 'CONCAT', 'val': '.'})
    return out

def regex_to_postfix(tokens):
    prec = {'|': 1, 'CONCAT': 2, '*': 3, '+': 3}
    out = []
    stack = []
    for t in tokens:
        if t['type'] == 'CHAR':
            out.append(t)
        elif t['type'] == '(':
            stack.append(t)
        elif t['type'] == ')':
            while stack and stack[-1]['type'] != '(':
                out.append(stack.pop())
            if stack:
                stack.pop()
        else:
            while stack and stack[-1]['type'] != '(' and prec.get(stack[-1]['type'], 0) >= prec.get(t['type'], 0):
                out.append(stack.pop())
            stack.append(t)
    while stack:
        out.append(stack.pop())
    return out

def build_nfa_from_postfix(postfix):
    counter = ThompsonStateCounter()
    stack = []
    transitions = {}
    alphabet = set()

    def add_t(from_state, sym, to_state):
        key = f"{from_state}|||{sym}"
        if key not in transitions:
            transitions[key] = []
        if to_state not in transitions[key]:
            transitions[key].append(to_state)
        if sym != 'ε':
            alphabet.add(sym)

    for t in postfix:
        if t['type'] == 'CHAR':
            s = counter.new_state()
            e = counter.new_state()
            val = 'ε' if t['val'] == 'ε' else t['val']
            add_t(s, val, e)
            stack.append({
                'start': s,
                'end': e,
                'layout': {'type': 'char', 'start': s, 'end': e}
            })
        elif t['type'] == 'CONCAT':
            if len(stack) < 2:
                raise ValueError("Regex tidak valid")
            b = stack.pop()
            a = stack.pop()
            add_t(a['end'], 'ε', b['start'])
            stack.append({
                'start': a['start'],
                'end': b['end'],
                'layout': {'type': 'concat', 'left': a['layout'], 'right': b['layout']}
            })
        elif t['type'] == '|':
            if len(stack) < 2:
                raise ValueError("Regex tidak valid")
            b = stack.pop()
            a = stack.pop()
            s = counter.new_state()
            e = counter.new_state()
            add_t(s, 'ε', a['start'])
            add_t(s, 'ε', b['start'])
            add_t(a['end'], 'ε', e)
            add_t(b['end'], 'ε', e)
            stack.append({
                'start': s,
                'end': e,
                'layout': {
                    'type': 'union',
                    'top': a['layout'],
                    'bottom': b['layout'],
                    'start': s,
                    'end': e
                }
            })
        elif t['type'] == '*':
            if len(stack) < 1:
                raise ValueError("Regex tidak valid")
            a = stack.pop()
            s = counter.new_state()
            e = counter.new_state()
            add_t(s, 'ε', a['start'])
            add_t(s, 'ε', e)
            add_t(a['end'], 'ε', a['start'])
            add_t(a['end'], 'ε', e)
            stack.append({
                'start': s,
                'end': e,
                'layout': {'type': 'star', 'child': a['layout'], 'start': s, 'end': e}
            })
        elif t['type'] == '+':
            if len(stack) < 1:
                raise ValueError("Regex tidak valid")
            a = stack.pop()
            s = counter.new_state()
            e = counter.new_state()
            add_t(s, 'ε', a['start'])
            add_t(a['end'], 'ε', a['start'])
            add_t(a['end'], 'ε', e)
            stack.append({
                'start': s,
                'end': e,
                'layout': {'type': 'plus', 'child': a['layout'], 'start': s, 'end': e}
            })

    if not stack:
        raise ValueError("Regex tidak valid")

    result = stack[0]
    state_set = set()
    for k, dests in transitions.items():
        state_set.add(k.split('|||')[0])
        for d in dests:
            state_set.add(d)
    state_set.add(result['start'])
    state_set.add(result['end'])

    def state_key(s):
        try:
            return int(s[1:])
        except ValueError:
            return 99999

    sorted_states = sorted(list(state_set), key=state_key)

    return {
        'states': sorted_states,
        'alpha': sorted(list(alphabet)),
        'start': result['start'],
        'finals': [result['end']],
        'trans': transitions,
        'layoutTree': result['layout']
    }
