import collections

def minimize_dfa(dfa_instance):
    # 1. Reachability Analysis
    reachable = set([dfa_instance.start_state])
    queue = collections.deque([dfa_instance.start_state])
    while queue:
        curr = queue.popleft()
        for sym in dfa_instance.alphabet:
            key = f"{curr}|||{sym}"
            nxt = dfa_instance.transitions.get(key)
            if nxt and nxt in dfa_instance.states and nxt not in reachable:
                reachable.add(nxt)
                queue.append(nxt)

    r_states = sorted(list(reachable))

    # Helper to get the group index of a state
    def get_group_idx(state, partition):
        for i, group in enumerate(partition):
            if state in group:
                return i
        return -1

    # 2. Initial Partition: Final states vs Non-final states
    group_finals = [s for s in r_states if s in dfa_instance.final_states]
    group_nonfinals = [s for s in r_states if s not in dfa_instance.final_states]

    partition = []
    if group_finals:
        partition.append(group_finals)
    if group_nonfinals:
        partition.append(group_nonfinals)

    # 3. Partition Refinement Loop
    changed = True
    while changed:
        changed = False
        new_partition = []
        for group in partition:
            if len(group) <= 1:
                new_partition.append(group)
                continue

            # Group states by their transition signatures
            subgroups = {}
            for s in group:
                sig = []
                for a in dfa_instance.alphabet:
                    dest = dfa_instance.transitions.get(f"{s}|||{a}")
                    sig.append(get_group_idx(dest, partition))
                
                sig_tuple = tuple(sig)
                if sig_tuple not in subgroups:
                    subgroups[sig_tuple] = []
                subgroups[sig_tuple].append(s)

            if len(subgroups) > 1:
                changed = True
            
            for sub in subgroups.values():
                new_partition.append(sub)
        partition = new_partition

    # Find the group containing start state
    start_group_idx = -1
    for idx, group in enumerate(partition):
        if dfa_instance.start_state in group:
            start_group_idx = idx
            break

    # Reorder partition so that the start group is first (helps make it M0)
    if start_group_idx > 0:
        partition.insert(0, partition.pop(start_group_idx))

    # 4. Construct Minimized DFA
    min_states = [f"M{i}" for i in range(len(partition))]
    min_start = "M0"
    min_finals = []
    min_transitions = {}
    partition_mapping = []

    for i, group in enumerate(partition):
        state_name = f"M{i}"
        partition_mapping.append({
            'group': [s for s in group],
            'name': state_name
        })
        
        if any(s in dfa_instance.final_states for s in group):
            min_finals.append(state_name)

        rep = group[0]
        for a in dfa_instance.alphabet:
            dest = dfa_instance.transitions.get(f"{rep}|||{a}")
            if dest:
                dest_group_idx = -1
                for j, g in enumerate(partition):
                    if dest in g:
                        dest_group_idx = j
                        break
                if dest_group_idx != -1:
                    min_transitions[f"{state_name}|||{a}"] = f"M{dest_group_idx}"

    return {
        'states': min_states,
        'alpha': dfa_instance.alphabet,
        'start': min_start,
        'finals': min_finals,
        'trans': min_transitions,
        'mapping': partition_mapping,
        'reduced_count': len(dfa_instance.states) - len(min_states)
    }
