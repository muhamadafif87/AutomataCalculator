import collections

def check_equivalence(dfa1, dfa2):
    # Check if alphabets are equivalent
    a1 = set(dfa1.alphabet)
    a2 = set(dfa2.alphabet)
    if a1 != a2:
        return False, "Alphabet berbeda"

    alpha = sorted(list(a1))
    visited = set()
    queue = collections.deque([(dfa1.start_state, dfa2.start_state)])
    
    # Store path to reconstruct counterexample
    path = {f"{dfa1.start_state},{dfa2.start_state}": ""}
    inequiv = False
    counter_ex = None

    while queue and not inequiv:
        s1, s2 = queue.popleft()
        key = f"{s1},{s2}"
        if key in visited:
            continue
        visited.add(key)

        f1 = s1 in dfa1.final_states
        f2 = s2 in dfa2.final_states

        if f1 != f2:
            inequiv = True
            counter_ex = path.get(key, "")
            if counter_ex == "":
                counter_ex = "ε"
            break

        for a in alpha:
            n1 = dfa1.transitions.get(f"{s1}|||{a}", "∅")
            n2 = dfa2.transitions.get(f"{s2}|||{a}", "∅")
            
            nk = f"{n1},{n2}"
            if nk not in visited:
                queue.append((n1, n2))
                path[nk] = path[key] + a

    if inequiv:
        return False, counter_ex
    return True, None
